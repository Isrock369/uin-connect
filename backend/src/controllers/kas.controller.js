const { pool } = require('../config/db')

async function getAll(req, res) {
  const [rows] = await pool.query(`
    SELECT id, tanggal, keterangan, jenis, jumlah, penjualan_organik_id AS referensi
    FROM transaksi_kas ORDER BY tanggal DESC, id DESC
  `)
  res.json(rows)
}

// POST /api/kas (protected) — entri manual, misal pengeluaran operasional
async function create(req, res) {
  const { tanggal, keterangan, jenis, jumlah } = req.body
  if (!tanggal || !keterangan || !jenis || !jumlah) {
    return res.status(400).json({ message: 'Semua field wajib diisi.' })
  }
  if (!['masuk', 'keluar'].includes(jenis)) {
    return res.status(400).json({ message: "jenis harus 'masuk' atau 'keluar'." })
  }
  const [result] = await pool.query(
    'INSERT INTO transaksi_kas (tanggal, keterangan, jenis, jumlah, dicatat_oleh) VALUES (?, ?, ?, ?, ?)',
    [tanggal, keterangan, jenis, jumlah, req.user.id]
  )
  res.status(201).json({ id: result.insertId })
}

module.exports = { getAll, create }
