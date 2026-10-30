const router = require('express').Router()
const { login, me, changePassword } = require('../controllers/auth.controller')
const { requireAuth } = require('../middleware/auth')

const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const attempts = new Map()
function limitPasswordChanges(req, res, next) {
  const now = Date.now()
  for (const [id, entry] of attempts) {
    if (entry.until <= now) attempts.delete(id)
  }
  const entry = attempts.get(req.user.id) || { count: 0, until: now + 15 * 60 * 1000 }
  if (entry.count >= 5) {
    res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)))
    return res.status(429).json({ message: 'Terlalu banyak percobaan. Coba lagi setelah 15 menit.' })
  }
  entry.count += 1
  attempts.set(req.user.id, entry)
  next()
}

router.post('/login', safe(login))
router.get('/me', requireAuth, safe(me))
router.post('/change-password', requireAuth, limitPasswordChanges, safe(changePassword))

module.exports = router
