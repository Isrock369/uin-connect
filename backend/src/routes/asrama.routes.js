const router = require('express').Router()
const ctrl = require('../controllers/asrama.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/', ctrl.getAll) // publik: dipakai dropdown form kamar
router.post('/', requireAuth, ctrl.create)

module.exports = router
