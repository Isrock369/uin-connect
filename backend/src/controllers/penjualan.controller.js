const tx = require('../utils/transaction')
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
  return tx.run(req, res, 'penjualan', b => ({ tanggal: tx.date(b.tanggal), pembeli: tx.text(b.pembeli, 'Pembeli', 150), produk: tx.text(b.produk, 'Produk', 100), jumlah: tx.number(b.jumlah, 'Berat', 999999.99, 2), hargaPerKg: tx.number(b.hargaPerKg, 'Harga per kg') }), async (conn, d) => {
    const total = Math.round(Math.round(d.jumlah * 100) * d.hargaPerKg / 100)
    if (!Number.isSafeInteger(total) || total < 1 || total > 4294967295) throw new tx.InputError('Total penjualan harus antara Rp1 dan Rp4.294.967.295.')
    const [r] = await conn.query('INSERT INTO penjualan_organik (tanggal, pembeli, produk, jumlah_kg, harga_per_kg, dicatat_oleh) VALUES (?, ?, ?, ?, ?, ?)', [d.tanggal, d.pembeli, d.produk, d.jumlah, d.hargaPerKg, req.user.id])
    // Gunakan hasil generated column MySQL supaya nilai kas persis sama.
    const [[sale]] = await conn.query('SELECT total FROM penjualan_organik WHERE id = ?', [r.insertId])
    const keterangan = Array.from(`Penjualan ${d.produk} — ${d.pembeli}`).slice(0, 255).join('')
    await conn.query("INSERT INTO transaksi_kas (tanggal, keterangan, jenis, jumlah, penjualan_organik_id, dicatat_oleh) VALUES (?, ?, 'masuk', ?, ?, ?)", [d.tanggal, keterangan, sale.total, r.insertId, req.user.id])
    return { id: r.insertId, total: sale.total }
  })
}


module.exports = { getAll, create }
