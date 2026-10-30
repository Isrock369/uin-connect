require('dotenv').config()
const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')
const { verifyPassword, hashPassword } = require('../utils/password')
const { credentialVersion } = require('../utils/session')

async function login(req, res) {
  const { username, password } = req.body
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || password.length > 128) {
    return res.status(400).json({ message: 'Username dan password wajib diisi.' })
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
  const user = rows[0]

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ message: 'Username atau password salah.' })
  }

  const payload = { id: user.id, username: user.username, nama: user.nama, role: user.role }
  const token = jwt.sign({ ...payload, credentialVersion: credentialVersion(user.password_hash) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  })

  res.json({ token, user: payload })
}

async function me(req, res) {
  // req.user diisi oleh middleware requireAuth
  res.json({ user: req.user })
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 128 ||
      typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
    return res.status(400).json({ message: 'Isi password lama dan password baru sepanjang 12–128 karakter.' })
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ message: 'Password baru harus berbeda dari password lama.' })
  }
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id])
  const user = rows[0]
  if (!user || !verifyPassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ message: 'Password lama tidak sesuai.' })
  }
  const [result] = await pool.query(
    'UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ?',
    [hashPassword(newPassword), req.user.id, user.password_hash]
  )
  if (result.affectedRows !== 1) {
    return res.status(409).json({ message: 'Password sudah berubah. Silakan login kembali.' })
  }
  res.json({ message: 'Password berhasil diganti. Silakan login kembali dengan password baru.' })
}

module.exports = { login, me, changePassword }
