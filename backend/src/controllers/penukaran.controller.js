const tx = require('../utils/transaction')
const { todayWib } = require('../utils/businessDate')
const { pool } = require('../config/db')

async function getAll(req, res) {
  const [rows] = await pool.query(`
    SELECT p.id, p.kamar_id AS kamarId, k.nama AS kamarNama, p.barang_id AS barangId,
           b.nama AS barangNama, p.jumlah, p.poin_digunakan AS poinDigunakan, p.tanggal
    FROM penukaran p
    JOIN kamar k ON k.id = p.kamar_id
    JOIN barang_katalog b ON b.id = p.barang_id
    ORDER BY p.tanggal DESC, p.id DESC
  `)
  res.json(rows)
}

// POST /api/penukaran (protected) — kurangi poin kamar & stok barang dalam 1 transaksi
async function create(req, res) {
  return tx.run(req, res, 'penukaran', b => ({ kamarId: tx.number(b.kamarId, 'Kamar'), barangId: tx.number(b.barangId, 'Barang'), jumlah: tx.number(b.jumlah, 'Jumlah') }), async (conn, d) => {
    const [[kamar]] = await conn.query('SELECT poin FROM kamar WHERE id = ? FOR UPDATE', [d.kamarId])
    const [[barang]] = await conn.query('SELECT harga_poin, stok FROM barang_katalog WHERE id = ? FOR UPDATE', [d.barangId])
    if (!kamar || !barang) throw new tx.InputError('Kamar atau barang tidak ditemukan.', 404)
    const totalPoin = barang.harga_poin * d.jumlah
    if (!Number.isSafeInteger(totalPoin) || totalPoin > 4294967295) throw new tx.InputError('Total poin melebihi batas.')
    if (kamar.poin < totalPoin) throw new tx.InputError('Poin kamar tidak cukup untuk penukaran ini.')
    if (barang.stok < d.jumlah) throw new tx.InputError('Stok barang tidak mencukupi.')
    const [r] = await conn.query('INSERT INTO penukaran (kamar_id, barang_id, jumlah, poin_digunakan, tanggal, diproses_oleh) VALUES (?, ?, ?, ?, ?, ?)', [d.kamarId, d.barangId, d.jumlah, totalPoin, todayWib(), req.user.id])
    await conn.query('UPDATE kamar SET poin = poin - ? WHERE id = ?', [totalPoin, d.kamarId])
    await conn.query('UPDATE barang_katalog SET stok = stok - ? WHERE id = ?', [d.jumlah, d.barangId])
    return { id: r.insertId, poinDigunakan: totalPoin }
  })
}


module.exports = { getAll, create }
