// Middleware untuk melindungi endpoint yang hanya boleh diakses
// oleh pengurus yang sudah login (dipakai di WEBSITE, TIDAK dipakai
// oleh endpoint Portal Santri yang memang sengaja dibuat publik).
require('dotenv').config()
const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')
const { credentialVersion } = require('../utils/session')

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login kembali.' })
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    return res.status(401).json({ message: 'Sesi tidak valid atau sudah habis. Silakan login kembali.' })
  }
  try {
    const [rows] = await pool.query('SELECT id, username, nama, role, password_hash FROM users WHERE id = ?', [payload.id])
    const user = rows[0]
    if (!user || payload.credentialVersion !== credentialVersion(user.password_hash)) {
      return res.status(401).json({ message: 'Sesi sudah berakhir. Silakan login kembali.' })
    }
    req.user = { id: user.id, username: user.username, nama: user.nama, role: user.role }
    next()
  } catch (err) {
    next(err)
  }
}

// Middleware tambahan opsional: batasi endpoint tertentu hanya untuk role 'admin'
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang boleh mengakses fitur ini.' })
  }
  next()
}

module.exports = { requireAuth, requireAdmin }
