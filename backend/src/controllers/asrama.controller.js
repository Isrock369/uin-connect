const { pool } = require('../config/db')

async function getAll(req, res) {
  const [rows] = await pool.query('SELECT id, nama FROM asrama ORDER BY nama ASC')
  res.json(rows)
}

async function create(req, res) {
  const { nama } = req.body
  if (!nama) return res.status(400).json({ message: 'nama wajib diisi.' })
  try {
    const [result] = await pool.query('INSERT INTO asrama (nama) VALUES (?)', [nama])
    res.status(201).json({ id: result.insertId })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Asrama dengan nama ini sudah ada.' })
    }
    throw err
  }
}

async function update(req, res) {
  const { nama } = req.body
  if (!nama) return res.status(400).json({ message: 'nama wajib diisi.' })
  await pool.query('UPDATE asrama SET nama = ? WHERE id = ?', [nama, req.params.id])
  res.json({ message: 'Asrama berhasil diperbarui.' })
}

async function remove(req, res) {
  try {
    await pool.query('DELETE FROM asrama WHERE id = ?', [req.params.id])
    res.json({ message: 'Asrama berhasil dihapus.' })
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'Asrama ini tidak bisa dihapus karena masih dipakai oleh kamar.' })
    }
    throw err
  }
}

module.exports = { getAll, create, update, remove }
