// Koneksi ke MySQL menggunakan connection pool (mysql2/promise)
// Semua kredensial diambil dari file .env — JANGAN hardcode di sini.
require('dotenv').config()
const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bank_sampah_pesantren',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // supaya kolom DATE/DATETIME balik sebagai string 'YYYY-MM-DD', bukan objek Date
})

// Tes koneksi sekali saat server start, biar error kredensial ketahuan dari awal
async function testConnection() {
  try {
    const conn = await pool.getConnection()
    console.log('✅ Berhasil terhubung ke MySQL:', process.env.DB_NAME)
    conn.release()
  } catch (err) {
    console.error('❌ Gagal terhubung ke MySQL:', err.message)
  }
}

module.exports = { pool, testConnection }
