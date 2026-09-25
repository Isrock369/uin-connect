// Jalankan sekali di awal: `npm run seed`
// Membuat 1 akun pengurus default untuk login pertama kali ke Website.
require('dotenv').config()
const { pool } = require('../config/db')
const { hashPassword } = require('./password')

async function seed() {
  const username = 'admin'
  const password = 'admin123' // GANTI setelah login pertama kali!
  const nama = 'Administrator'

  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
  if (existing.length > 0) {
    console.log('Akun admin sudah ada, tidak dibuat ulang.')
    process.exit(0)
  }

  const passwordHash = hashPassword(password)
  await pool.query(
    'INSERT INTO users (nama, username, password_hash, role) VALUES (?, ?, ?, ?)',
    [nama, username, passwordHash, 'admin']
  )

  console.log('✅ Akun admin berhasil dibuat!')
  console.log('   username: admin')
  console.log('   password: admin123  (segera ganti setelah login)')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Gagal membuat akun admin:', err)
  process.exit(1)
})
