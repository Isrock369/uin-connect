const router = require('express').Router()
const ctrl = require('../controllers/laporan.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/ringkasan', requireAuth, ctrl.ringkasan)
router.get('/poin-per-kamar', requireAuth, ctrl.poinPerKamar)

module.exports = router
