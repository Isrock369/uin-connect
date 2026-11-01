const { pool } = require('../config/db')

function name(body) {
  if (typeof body?.nama !== 'string' || !body.nama.trim() || body.nama.trim().length > 50) {
    throw Object.assign(new Error('Nama kategori wajib diisi, maksimal 50 karakter.'), { status: 400 })
  }
  return body.nama.trim()
}

async function getAll(req, res) {
  const [rows] = await pool.query('SELECT kategori.id, kategori.nama, COUNT(modul.id) AS jumlah FROM kategori_panduan kategori LEFT JOIN modul_edukasi modul ON modul.kategori_id=kategori.id GROUP BY kategori.id, kategori.nama ORDER BY kategori.nama')
  res.json(rows.map(row => ({ ...row, id: String(row.id), jumlah: Number(row.jumlah) })))
}
async function create(req, res) {
  const [result] = await pool.query('INSERT INTO kategori_panduan (nama) VALUES (?)', [name(req.body)])
  res.status(201).json({ id: String(result.insertId) })
}
async function update(req, res) {
  const [result] = await pool.query('UPDATE kategori_panduan SET nama=? WHERE id=?', [name(req.body), req.params.id])
  if (!result.affectedRows) return res.status(404).json({ message: 'Kategori tidak ditemukan.' })
  res.json({ message: 'Kategori diperbarui.' })
}
async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM kategori_panduan WHERE id=?', [req.params.id])
  if (!result.affectedRows) return res.status(404).json({ message: 'Kategori tidak ditemukan.' })
  res.json({ message: 'Kategori dihapus.' })
}
module.exports = { getAll, create, update, remove }
