const { pool } = require('../config/db')

async function getAll(req, res) {
  const [rows] = await pool.query(`
    SELECT id, tanggal, pembeli, produk, jumlah_kg AS jumlah, harga_per_kg AS hargaPerKg, total
    FROM penjualan_organik ORDER BY tanggal DESC, id DESC
  `)
  res.json(rows)
}

// POST /api/penjualan (protected) — otomatis bikin entri transaksi_kas 'masuk' (1 transaksi)
async function create(req, res) {
  const { tanggal, pembeli, produk, jumlah, hargaPerKg } = req.body
  if (!tanggal || !pembeli || !produk || !jumlah || !hargaPerKg) {
    return res.status(400).json({ message: 'Semua field wajib diisi.' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [result] = await conn.query(
      'INSERT INTO penjualan_organik (tanggal, pembeli, produk, jumlah_kg, harga_per_kg, dicatat_oleh) VALUES (?, ?, ?, ?, ?, ?)',
      [tanggal, pembeli, produk, jumlah, hargaPerKg, req.user.id]
    )
    const total = jumlah * hargaPerKg

    await conn.query(
      `INSERT INTO transaksi_kas (tanggal, keterangan, jenis, jumlah, penjualan_organik_id, dicatat_oleh)
       VALUES (?, ?, 'masuk', ?, ?, ?)`,
      [tanggal, `Penjualan ${produk} — ${pembeli}`, total, result.insertId, req.user.id]
    )

    await conn.commit()
    res.status(201).json({ id: result.insertId, total })
  } catch (err) {
    await conn.rollback()
    console.error(err)
    res.status(500).json({ message: 'Gagal mencatat penjualan.' })
  } finally {
    conn.release()
  }
}

module.exports = { getAll, create }
