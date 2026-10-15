const router = require('express').Router()
const ctrl = require('../controllers/data.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

// Endpoint debugging: hanya admin yang sudah login.
// GET /api/data              -> ringkasan data dari semua tabel
// GET /api/data/:table       -> seluruh baris dari satu tabel tertentu
router.get('/', requireAuth, requireAdmin, ctrl.getAll)
router.get('/:table', requireAuth, requireAdmin, ctrl.getByTable)

module.exports = router
