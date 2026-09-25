const { pool } = require('../config/db')

// GET /api/tarif-sampah (PUBLIK — wajib dipakai Portal Santri untuk pilih jenis sampah)
async function getAll(req, res) {
  const [rows] = await pool.query(`
    SELECT id, jenis, kategori, poin_per_kg AS poinPerKg, keterangan
    FROM tarif_sampah ORDER BY id ASC
  `)
  res.json(rows)
}

async function update(req, res) {
  const { poinPerKg, keterangan } = req.body
  await pool.query('UPDATE tarif_sampah SET poin_per_kg = ?, keterangan = ? WHERE id = ?', [
    poinPerKg, keterangan, req.params.id,
  ])
  res.json({ message: 'Tarif berhasil diperbarui.' })
}

module.exports = { getAll, update }
