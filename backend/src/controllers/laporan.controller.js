const { pool } = require('../config/db')

// GET /api/laporan/ringkasan — dipakai halaman Dashboard/Ringkasan
async function ringkasan(req, res) {
  const [[{ totalPoinAktif }]] = await pool.query('SELECT COALESCE(SUM(poin),0) AS totalPoinAktif FROM kamar')
  const [[{ totalSetoranMenunggu }]] = await pool.query(
    "SELECT COUNT(*) AS totalSetoranMenunggu FROM setoran WHERE status = 'menunggu'"
  )
  const [[{ totalBeratBulanIni }]] = await pool.query(`
    SELECT COALESCE(SUM(berat_kg),0) AS totalBeratBulanIni FROM setoran
    WHERE status = 'disetujui' AND MONTH(tanggal) = MONTH(CURDATE()) AND YEAR(tanggal) = YEAR(CURDATE())
  `)
  const [[{ saldoKas }]] = await pool.query(`
    SELECT COALESCE(SUM(CASE WHEN jenis='masuk' THEN jumlah ELSE -jumlah END),0) AS saldoKas
    FROM transaksi_kas
  `)
  const [topKamar] = await pool.query('SELECT nama, poin FROM kamar ORDER BY poin DESC LIMIT 5')

  res.json({ totalPoinAktif, totalSetoranMenunggu, totalBeratBulanIni, saldoKas, topKamar })
}

// GET /api/laporan/poin-per-kamar
async function poinPerKamar(req, res) {
  const [rows] = await pool.query(`
    SELECT k.nama, a.nama AS asrama, k.poin
    FROM kamar k JOIN asrama a ON a.id = k.asrama_id
    ORDER BY k.poin DESC
  `)
  res.json(rows)
}

module.exports = { ringkasan, poinPerKamar }
