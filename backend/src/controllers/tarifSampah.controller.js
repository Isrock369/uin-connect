const { pool } = require('../config/db')

// GET /api/tarif-sampah (PUBLIK — wajib dipakai Portal Santri untuk pilih jenis sampah)
async function getAll(req, res) {
  const [rows] = await pool.query(`
    SELECT id, jenis, kategori, poin_per_kg AS poinPerKg, keterangan
    FROM tarif_sampah ORDER BY id ASC
  `)
  res.json(rows)
}

async function update(req, res) {
  const { jenis, kategori, poinPerKg, keterangan } = req.body
  await pool.query(
    'UPDATE tarif_sampah SET jenis = ?, kategori = ?, poin_per_kg = ?, keterangan = ? WHERE id = ?',
    [jenis, kategori, poinPerKg, keterangan, req.params.id]
  )
  res.json({ message: 'Tarif berhasil diperbarui.' })
}

async function create(req, res) {
  const { jenis, kategori, poinPerKg, keterangan } = req.body
  if (!jenis || !kategori) {
    return res.status(400).json({ message: 'Jenis dan kategori wajib diisi.' })
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO tarif_sampah (jenis, kategori, poin_per_kg, keterangan) VALUES (?, ?, ?, ?)',
      [jenis, kategori, poinPerKg || 0, keterangan || null]
    )
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Jenis sampah dengan nama ini sudah ada.' })
    }
    throw err
  }
}

async function remove(req, res) {
  try {
    await pool.query('DELETE FROM tarif_sampah WHERE id = ?', [req.params.id])
    res.json({ message: 'Kategori berhasil dihapus.' })
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({
        message: 'Kategori ini tidak bisa dihapus karena sudah dipakai di data setoran.',
      })
    }
    throw err
  }
}

module.exports = { getAll, create, update, remove }
