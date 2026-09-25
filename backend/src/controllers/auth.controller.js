require('dotenv').config()
const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')
const { verifyPassword } = require('../utils/password')

async function login(req, res) {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi.' })
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
  const user = rows[0]

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: 'Username atau password salah.' })
  }

  const payload = { id: user.id, username: user.username, nama: user.nama, role: user.role }
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  })

  res.json({ token, user: payload })
}

async function me(req, res) {
  // req.user diisi oleh middleware requireAuth
  res.json({ user: req.user })
}

module.exports = { login, me }
