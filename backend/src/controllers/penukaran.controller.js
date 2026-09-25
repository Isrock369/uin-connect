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
  const { kamarId, barangId, jumlah } = req.body
  if (!kamarId || !barangId || !jumlah) {
    return res.status(400).json({ message: 'kamarId, barangId, dan jumlah wajib diisi.' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [kamarRows] = await conn.query('SELECT poin FROM kamar WHERE id = ? FOR UPDATE', [kamarId])
    const [barangRows] = await conn.query('SELECT harga_poin, stok FROM barang_katalog WHERE id = ? FOR UPDATE', [barangId])

    if (kamarRows.length === 0 || barangRows.length === 0) {
      await conn.rollback()
      return res.status(404).json({ message: 'Kamar atau barang tidak ditemukan.' })
    }

    const totalPoin = barangRows[0].harga_poin * jumlah

    if (kamarRows[0].poin < totalPoin) {
      await conn.rollback()
      return res.status(400).json({ message: 'Poin kamar tidak cukup untuk penukaran ini.' })
    }
    if (barangRows[0].stok < jumlah) {
      await conn.rollback()
      return res.status(400).json({ message: 'Stok barang tidak mencukupi.' })
    }

    const tanggal = new Date().toISOString().slice(0, 10)
    const [result] = await conn.query(
      'INSERT INTO penukaran (kamar_id, barang_id, jumlah, poin_digunakan, tanggal, diproses_oleh) VALUES (?, ?, ?, ?, ?, ?)',
      [kamarId, barangId, jumlah, totalPoin, tanggal, req.user.id]
    )
    await conn.query('UPDATE kamar SET poin = poin - ? WHERE id = ?', [totalPoin, kamarId])
    await conn.query('UPDATE barang_katalog SET stok = stok - ? WHERE id = ?', [jumlah, barangId])

    await conn.commit()
    res.status(201).json({ id: result.insertId, poinDigunakan: totalPoin })
  } catch (err) {
    await conn.rollback()
    console.error(err)
    res.status(500).json({ message: 'Gagal memproses penukaran.' })
  } finally {
    conn.release()
  }
}

module.exports = { getAll, create }
