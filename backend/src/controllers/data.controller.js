// Endpoint generik untuk mengambil data mentah dari database MySQL.
// Berguna untuk keperluan debugging/integrasi cepat dari frontend/service lain.
const { pool } = require('../config/db')

// GET /api/data
// Mengambil daftar semua tabel di database, lalu contoh data (maks 100 baris) dari tiap tabel.
async function getAll(req, res) {
  try {
    const [tables] = await pool.query('SHOW TABLES')
    const tableKey = tables.length > 0 ? Object.keys(tables[0])[0] : null
    const tableNames = tableKey ? tables.map((row) => row[tableKey]) : []

    const data = {}
    for (const tableName of tableNames) {
      try {
        const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT 100`)
        data[tableName] = rows
      } catch (err) {
        data[tableName] = { error: `Gagal mengambil data: ${err.message}` }
      }
    }

    res.json({ tables: tableNames, data })
  } catch (err) {
    console.error('Gagal mengambil data dari MySQL:', err.message)
    res.status(500).json({ message: 'Gagal terhubung/mengambil data dari database.', error: err.message })
  }
}

// GET /api/data/:table
// Mengambil seluruh baris (maks 1000) dari satu tabel tertentu.
// Nama tabel divalidasi terhadap daftar tabel yang benar-benar ada, untuk mencegah SQL injection.
async function getByTable(req, res) {
  const { table } = req.params

  try {
    const [tables] = await pool.query('SHOW TABLES')
    const tableKey = tables.length > 0 ? Object.keys(tables[0])[0] : null
    const tableNames = tableKey ? tables.map((row) => row[tableKey]) : []

    if (!tableNames.includes(table)) {
      return res.status(404).json({ message: `Tabel '${table}' tidak ditemukan.` })
    }

    const [rows] = await pool.query(`SELECT * FROM \`${table}\` LIMIT 1000`)
    res.json(rows)
  } catch (err) {
    console.error('Gagal mengambil data dari MySQL:', err.message)
    res.status(500).json({ message: 'Gagal terhubung/mengambil data dari database.', error: err.message })
  }
}

module.exports = { getAll, getByTable }
