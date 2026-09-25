const { pool } = require('../config/db')

// POST /api/verifikasi-setoran (PUBLIK — dipakai Portal Santri untuk menghitung estimasi poin
// sebelum/pada saat setoran dikirim, tanpa menyimpan apa pun ke database).
//
// Body yang diterima:
//   { jenis: "Organik", beratKg: 5 }              -- cari berdasarkan nama jenis sampah
//   { tarifSampahId: 1, beratKg: 5 }               -- atau cari berdasarkan id tarif_sampah
//
// Response:
//   { jenis: "Organik", beratKg: 5, poinPerKg: 10, totalPoin: 50 }
async function verifikasi(req, res) {
  const { jenis, tarifSampahId } = req.body
  const beratKg = Number(req.body.beratKg ?? req.body.berat_kg ?? req.body.berat)

  if (!jenis && !tarifSampahId) {
    return res.status(400).json({ message: 'jenis atau tarifSampahId wajib diisi.' })
  }
  if (!beratKg || Number.isNaN(beratKg) || beratKg <= 0) {
    return res.status(400).json({ message: 'beratKg wajib diisi dan harus lebih besar dari 0.' })
  }

  let query = 'SELECT id, jenis, poin_per_kg AS poinPerKg FROM tarif_sampah WHERE '
  const params = []
  if (tarifSampahId) {
    query += 'id = ?'
    params.push(tarifSampahId)
  } else {
    query += 'jenis = ?'
    params.push(jenis)
  }

  const [rows] = await pool.query(query, params)
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Jenis sampah tidak ditemukan.' })
  }

  const tarif = rows[0]
  const totalPoin = Math.round(tarif.poinPerKg * beratKg)

  res.json({
    jenis: tarif.jenis,
    beratKg,
    poinPerKg: tarif.poinPerKg,
    totalPoin,
  })
}

module.exports = { verifikasi }
