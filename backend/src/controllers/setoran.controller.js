const { pool } = require('../config/db')

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
  const { kamarId, tarifSampahId, piket, berat } = req.body
  if (!kamarId || !tarifSampahId || !berat) {
    return res.status(400).json({ message: 'kamarId, tarifSampahId, dan berat wajib diisi.' })
  }

  const [tarifRows] = await pool.query('SELECT poin_per_kg AS poinPerKg, jenis FROM tarif_sampah WHERE id = ?', [tarifSampahId])
  if (tarifRows.length === 0) return res.status(404).json({ message: 'Jenis sampah tidak ditemukan.' })

  const poin = Math.round(tarifRows[0].poinPerKg * Number(berat))
  const tanggal = new Date().toISOString().slice(0, 10)

  const [result] = await pool.query(
    `INSERT INTO setoran (kamar_id, tarif_sampah_id, piket, tanggal, berat_kg, poin, status)
     VALUES (?, ?, ?, ?, ?, ?, 'menunggu')`,
    [kamarId, tarifSampahId, piket || 'Santri (via Portal)', tanggal, berat, poin]
  )

  res.status(201).json({
    id: result.insertId,
    poin,
    jenisSampah: tarifRows[0].jenis,
    tanggal,
    status: 'menunggu',
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

module.exports = { getAll, create, verifikasi }
