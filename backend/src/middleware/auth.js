// Middleware untuk melindungi endpoint yang hanya boleh diakses
// oleh pengurus yang sudah login (dipakai di WEBSITE, TIDAK dipakai
// oleh endpoint Portal Santri yang memang sengaja dibuat publik).
require('dotenv').config()
const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ditemukan. Silakan login kembali.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload // { id, username, role, nama }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Sesi tidak valid atau sudah habis. Silakan login kembali.' })
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
