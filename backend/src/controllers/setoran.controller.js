const tx = require('../utils/transaction')
const { todayWib } = require('../utils/businessDate')
const { pool } = require('../config/db')

// Batas berat per setoran, sama dengan batas yang dipakai endpoint timbangan.
const BERAT_MAKS_KG = 50

function beratValid(berat) {
  try { tx.number(berat, 'Berat', BERAT_MAKS_KG, 2); return true } catch { return false }
}

// GET /api/setoran?status=menunggu  (protected — dipakai Website/Verifikasi)
async function getAll(req, res) {
  const { status } = req.query
  const params = []
  let sql = `
    SELECT s.id, s.kamar_id AS kamarId, k.nama AS kamarNama, s.piket, s.tanggal,
           t.jenis AS jenisSampah, s.berat_kg AS berat, s.poin, s.status, s.catatan
    FROM setoran s
    JOIN kamar k ON k.id = s.kamar_id
    JOIN tarif_sampah t ON t.id = s.tarif_sampah_id
  `
  if (status) {
    sql += ' WHERE s.status = ?'
    params.push(status)
  }
  sql += ' ORDER BY s.tanggal DESC, s.id DESC'
  const [rows] = await pool.query(sql, params)
  res.json(rows)
}

// POST /api/setoran  (PUBLIK — dikirim langsung dari Portal Santri/alat timbang IoT)
async function create(req, res) {
  return tx.run(req, res, 'setoran', (b) => {
    if (b.fotoDiminta !== undefined && typeof b.fotoDiminta !== 'boolean') throw new tx.InputError('fotoDiminta harus boolean.')
    return { kamarId: tx.number(b.kamarId, 'Kamar'), tarifSampahId: tx.number(b.tarifSampahId, 'Kategori'),
      piket: tx.text(b.piket ?? 'Santri (via Portal)', 'Piket', 100), berat: tx.number(b.berat, 'Berat', 50, 2), fotoDiminta: b.fotoDiminta === true }
  }, async (conn, d) => {
    const [[kamar]] = await conn.query('SELECT id FROM kamar WHERE id = ?', [d.kamarId])
    const [[tarif]] = await conn.query('SELECT poin_per_kg AS poinPerKg, jenis FROM tarif_sampah WHERE id = ?', [d.tarifSampahId])
    if (!kamar || !tarif) throw new tx.InputError('Kamar atau kategori sampah tidak ditemukan.', 404)
    const poin = Math.round(tarif.poinPerKg * d.berat)
    if (!Number.isSafeInteger(poin) || poin > 2147483647) throw new tx.InputError('Poin setoran melebihi batas.')
    const tanggal = todayWib()
    const [result] = await conn.query(`INSERT INTO setoran (kamar_id, tarif_sampah_id, piket, tanggal, berat_kg, poin, status)
      VALUES (?, ?, ?, ?, ?, ?, 'menunggu')`, [d.kamarId, d.tarifSampahId, d.piket, tanggal, d.berat, poin])
    if (d.fotoDiminta) await require('../utils/cameraQueue').enqueue(conn, result.insertId)
    return { id: result.insertId, poin, jenisSampah: tarif.jenis, tanggal, status: 'menunggu' }
  })
}


// PUT /api/setoran/:id/verifikasi  (protected — pengurus setuju/tolak dari Website)
// Kalau disetujui: poin otomatis ditambahkan ke saldo kamar & last_setoran diupdate,
// dilakukan dalam SATU transaksi supaya data tetap konsisten.
async function verifikasi(req, res) {
  const { status, catatan } = req.body // status: 'disetujui' | 'ditolak'
  if (!['disetujui', 'ditolak'].includes(status)) {
    return res.status(400).json({ message: "status harus 'disetujui' atau 'ditolak'." })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query('SELECT * FROM setoran WHERE id = ? FOR UPDATE', [req.params.id])
    const setoran = rows[0]
    if (!setoran) {
      await conn.rollback()
      return res.status(404).json({ message: 'Setoran tidak ditemukan.' })
    }
    if (setoran.status !== 'menunggu') {
      await conn.rollback()
      return res.status(400).json({ message: 'Setoran ini sudah diverifikasi sebelumnya.' })
    }

    await conn.query(
      `UPDATE setoran SET status = ?, catatan = ?, diverifikasi_oleh = ?, diverifikasi_at = NOW() WHERE id = ?`,
      [status, catatan || null, req.user.id, req.params.id]
    )

    if (status === 'disetujui') {
      await conn.query(
        'UPDATE kamar SET poin = poin + ?, last_setoran = ? WHERE id = ?',
        [setoran.poin, setoran.tanggal, setoran.kamar_id]
      )
    }

    await conn.commit()
    res.json({ message: `Setoran berhasil ${status}.` })
  } catch (err) {
    await conn.rollback()
    console.error(err)
    res.status(500).json({ message: 'Gagal memproses verifikasi setoran.' })
  } finally {
    conn.release()
  }
}

// PUT /api/setoran/:id  (protected — edit data setoran, dipakai pengurus)
// Kalau setoran sudah 'disetujui', poin lama di kamar dikurangi dulu lalu
// poin baru (hasil recalculate) ditambahkan, semua dalam SATU transaksi.
async function update(req, res) {
  let { kamarId, tarifSampahId, piket, tanggal, berat } = req.body
  try {
    tx.number(req.params.id, 'ID setoran')
    kamarId = tx.number(kamarId, 'Kamar')
    tarifSampahId = tx.number(tarifSampahId, 'Kategori')
    piket = tx.text(piket, 'Piket', 100)
    berat = tx.number(berat, 'Berat', 50, 2)
    if (tanggal !== undefined && tanggal !== '') tanggal = tx.date(tanggal)
  } catch (e) { return res.status(400).json({ message: e.message }) }
  if (!kamarId || !tarifSampahId || !piket || !berat) {
    return res.status(400).json({ message: 'kamarId, tarifSampahId, piket, dan berat wajib diisi.' })
  }
  if (!beratValid(berat)) {
    return res.status(400).json({ message: `berat harus lebih dari 0 dan maksimal ${BERAT_MAKS_KG} kg.` })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query('SELECT * FROM setoran WHERE id = ? FOR UPDATE', [req.params.id])
    const lama = rows[0]
    if (!lama) {
      await conn.rollback()
      return res.status(404).json({ message: 'Setoran tidak ditemukan.' })
    }

    const [tarifRows] = await conn.query('SELECT poin_per_kg AS poinPerKg FROM tarif_sampah WHERE id = ?', [tarifSampahId])
    if (tarifRows.length === 0) {
      await conn.rollback()
      return res.status(404).json({ message: 'Jenis sampah tidak ditemukan.' })
    }
    const poinBaru = Math.round(tarifRows[0].poinPerKg * Number(berat))
    if (!Number.isSafeInteger(poinBaru) || poinBaru > 2147483647) {
      await conn.rollback()
      return res.status(400).json({ message: 'Poin setoran melebihi batas.' })
    }

    // Kalau setoran lama sudah disetujui dan kamarnya berubah atau tetap sama,
    // batalkan dulu efek poin lama sebelum menerapkan yang baru.
    if (lama.status === 'disetujui') {
      await conn.query('UPDATE kamar SET poin = poin - ? WHERE id = ?', [lama.poin, lama.kamar_id])
      await conn.query('UPDATE kamar SET poin = poin + ? WHERE id = ?', [poinBaru, kamarId])
    }

    await conn.query(
      `UPDATE setoran SET kamar_id = ?, tarif_sampah_id = ?, piket = ?, tanggal = ?, berat_kg = ?, poin = ? WHERE id = ?`,
      [kamarId, tarifSampahId, piket, tanggal || lama.tanggal, berat, poinBaru, req.params.id]
    )

    await conn.commit()
    res.json({ message: 'Setoran berhasil diperbarui.' })
  } catch (err) {
    await conn.rollback()
    console.error(err)
    res.status(500).json({ message: 'Gagal memperbarui setoran.' })
  } finally {
    conn.release()
  }
}

// DELETE /api/setoran/:id  (protected)
// Kalau setoran sudah 'disetujui', poinnya dikurangi dulu dari saldo kamar
// sebelum baris setoran dihapus, supaya saldo tetap konsisten.
async function remove(req, res) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query('SELECT * FROM setoran WHERE id = ? FOR UPDATE', [req.params.id])
    const setoran = rows[0]
    if (!setoran) {
      await conn.rollback()
      return res.status(404).json({ message: 'Setoran tidak ditemukan.' })
    }

    if (setoran.status === 'disetujui') {
      await conn.query('UPDATE kamar SET poin = poin - ? WHERE id = ?', [setoran.poin, setoran.kamar_id])
    }

    await conn.query('DELETE FROM setoran WHERE id = ?', [req.params.id])

    await conn.commit()
    res.json({ message: 'Setoran berhasil dihapus.' })
  } catch (err) {
    await conn.rollback()
    console.error(err)
    res.status(500).json({ message: 'Gagal menghapus setoran.' })
  } finally {
    conn.release()
  }
}

module.exports = { getAll, create, verifikasi, update, remove }
