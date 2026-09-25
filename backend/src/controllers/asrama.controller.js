const { pool } = require('../config/db')

async function getAll(req, res) {
  const [rows] = await pool.query('SELECT id, nama FROM asrama ORDER BY nama ASC')
  res.json(rows)
}

async function create(req, res) {
  const { nama } = req.body
  if (!nama) return res.status(400).json({ message: 'nama wajib diisi.' })
  const [result] = await pool.query('INSERT INTO asrama (nama) VALUES (?)', [nama])
  res.status(201).json({ id: result.insertId })
}

module.exports = { getAll, create }
