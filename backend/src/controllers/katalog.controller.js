const { pool } = require('../config/db')

async function getAll(req, res) {
  const [rows] = await pool.query(`
    SELECT id, nama, kategori, harga_poin AS hargaPoin, stok, deskripsi FROM barang_katalog ORDER BY nama ASC
  `)
  res.json(rows)
}

async function create(req, res) {
  const { nama, kategori, hargaPoin, stok, deskripsi } = req.body
  const [result] = await pool.query(
    'INSERT INTO barang_katalog (nama, kategori, harga_poin, stok, deskripsi) VALUES (?, ?, ?, ?, ?)',
    [nama, kategori, hargaPoin, stok || 0, deskripsi || null]
  )
  res.status(201).json({ id: result.insertId })
}

async function update(req, res) {
  const { nama, kategori, hargaPoin, stok, deskripsi } = req.body
  await pool.query(
    'UPDATE barang_katalog SET nama=?, kategori=?, harga_poin=?, stok=?, deskripsi=? WHERE id=?',
    [nama, kategori, hargaPoin, stok, deskripsi, req.params.id]
  )
  res.json({ message: 'Barang berhasil diperbarui.' })
}

async function remove(req, res) {
  await pool.query('DELETE FROM barang_katalog WHERE id = ?', [req.params.id])
  res.json({ message: 'Barang berhasil dihapus.' })
}

module.exports = { getAll, create, update, remove }
