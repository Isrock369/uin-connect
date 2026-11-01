const tx = require('../utils/transaction')
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
  return tx.run(req, res, 'kas', b => {
    if (!['masuk', 'keluar'].includes(b.jenis)) throw new tx.InputError('Jenis kas harus masuk atau keluar.')
    return { tanggal: tx.date(b.tanggal), keterangan: tx.text(b.keterangan, 'Keterangan', 255), jenis: b.jenis, jumlah: tx.number(b.jumlah, 'Jumlah rupiah') }
  }, async (conn, d) => {
    const [r] = await conn.query('INSERT INTO transaksi_kas (tanggal, keterangan, jenis, jumlah, dicatat_oleh) VALUES (?, ?, ?, ?, ?)', [d.tanggal, d.keterangan, d.jenis, d.jumlah, req.user.id])
    return { id: r.insertId }
  })
}


module.exports = { getAll, create }
