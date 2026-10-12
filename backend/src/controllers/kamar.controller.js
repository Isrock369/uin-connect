const { pool } = require('../config/db')

// GET /api/kamar  (publik — dipakai Website utk daftar, dan Portal Santri utk pilih kamar)
async function getAll(req, res) {
  const [rows] = await pool.query(`
    SELECT k.id, k.nama, a.nama AS asrama, k.jumlah_santri AS jumlahSantri,
           k.poin, k.last_setoran AS lastSetoran
    FROM kamar k
    JOIN asrama a ON a.id = k.asrama_id
    ORDER BY k.poin DESC
  `)
  res.json(rows)
}

// GET /api/kamar/:id
async function getById(req, res) {
  const [rows] = await pool.query(`
    SELECT k.id, k.nama, a.nama AS asrama, k.jumlah_santri AS jumlahSantri,
           k.poin, k.last_setoran AS lastSetoran
    FROM kamar k JOIN asrama a ON a.id = k.asrama_id
    WHERE k.id = ?
  `, [req.params.id])
  if (rows.length === 0) return res.status(404).json({ message: 'Kamar tidak ditemukan.' })
  res.json(rows[0])
}

// GET /api/kamar/:id/riwayat  (publik — dipakai Portal Santri utk lihat riwayat setoran kamar)
// Hanya field yang aman ditampilkan: tanpa nama piket. Catatan hanya untuk setoran yang ditolak.
async function getRiwayat(req, res) {
  const [kamarRows] = await pool.query('SELECT id FROM kamar WHERE id = ?', [req.params.id])
  if (kamarRows.length === 0) return res.status(404).json({ message: 'Kamar tidak ditemukan.' })

  const [riwayat] = await pool.query(`
    SELECT s.id, DATE_FORMAT(s.tanggal, '%Y-%m-%d') AS tanggal, t.jenis AS jenisSampah,
           s.berat_kg AS berat, s.poin, s.status,
           CASE WHEN s.status = 'ditolak' THEN s.catatan ELSE NULL END AS catatan
    FROM setoran s
    JOIN tarif_sampah t ON t.id = s.tarif_sampah_id
    WHERE s.kamar_id = ?
    ORDER BY s.tanggal DESC, s.id DESC
    LIMIT 30
  `, [req.params.id])

  const [[sum]] = await pool.query(
    "SELECT COALESCE(SUM(poin), 0) AS poinMenunggu FROM setoran WHERE kamar_id = ? AND status = 'menunggu'",
    [req.params.id]
  )

  res.json({
    poinMenunggu: Number(sum.poinMenunggu),
    riwayat: riwayat.map((r) => ({ ...r, berat: Number(r.berat) })),
  })
}

// POST /api/kamar (protected)
async function create(req, res) {
  const { nama, asramaId, jumlahSantri } = req.body
  if (!nama || !asramaId) {
    return res.status(400).json({ message: 'nama dan asramaId wajib diisi.' })
  }
  const [result] = await pool.query(
    'INSERT INTO kamar (nama, asrama_id, jumlah_santri, poin) VALUES (?, ?, ?, 0)',
    [nama, asramaId, jumlahSantri || 0]
  )
  res.status(201).json({ id: result.insertId })
}

// PUT /api/kamar/:id (protected)
async function update(req, res) {
  const { nama, asramaId, jumlahSantri } = req.body
  await pool.query(
    'UPDATE kamar SET nama = ?, asrama_id = ?, jumlah_santri = ? WHERE id = ?',
    [nama, asramaId, jumlahSantri, req.params.id]
  )
  res.json({ message: 'Kamar berhasil diperbarui.' })
}

// DELETE /api/kamar/:id (protected)
async function remove(req, res) {
  await pool.query('DELETE FROM kamar WHERE id = ?', [req.params.id])
  res.json({ message: 'Kamar berhasil dihapus.' })
}

module.exports = { getAll, getById, getRiwayat, create, update, remove }
