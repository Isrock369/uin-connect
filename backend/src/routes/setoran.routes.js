const router = require('express').Router()
const ctrl = require('../controllers/setoran.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, ctrl.getAll)                 // protected: Website
router.post('/', ctrl.create)                              // PUBLIK: Portal Santri
router.put('/:id/verifikasi', requireAuth, ctrl.verifikasi) // protected: Website

module.exports = router
