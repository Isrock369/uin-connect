const { pool } = require('../config/db')

async function getAll(req, res) {
  const [rows] = await pool.query(`
    SELECT id, judul, kategori, deskripsi, konten, durasi_menit AS durasi,
           status, icon, tanggal_dibuat AS tanggalDibuat
    FROM modul_edukasi ORDER BY tanggal_dibuat DESC
  `)
  res.json(rows)
}

async function create(req, res) {
  const { judul, kategori, deskripsi, konten, durasi, status, icon } = req.body
  const tanggalDibuat = new Date().toISOString().slice(0, 10)
  const [result] = await pool.query(
    `INSERT INTO modul_edukasi (judul, kategori, deskripsi, konten, durasi_menit, status, icon, tanggal_dibuat)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [judul, kategori, deskripsi, konten, durasi || 5, status || 'draft', icon || '📘', tanggalDibuat]
  )
  res.status(201).json({ id: result.insertId })
}

async function update(req, res) {
  const { judul, kategori, deskripsi, konten, durasi, status, icon } = req.body
  await pool.query(
    `UPDATE modul_edukasi SET judul=?, kategori=?, deskripsi=?, konten=?, durasi_menit=?, status=?, icon=? WHERE id=?`,
    [judul, kategori, deskripsi, konten, durasi, status, icon, req.params.id]
  )
  res.json({ message: 'Modul berhasil diperbarui.' })
}

async function remove(req, res) {
  await pool.query('DELETE FROM modul_edukasi WHERE id = ?', [req.params.id])
  res.json({ message: 'Modul berhasil dihapus.' })
}

module.exports = { getAll, create, update, remove }
