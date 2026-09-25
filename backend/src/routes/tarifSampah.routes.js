const router = require('express').Router()
const ctrl = require('../controllers/tarifSampah.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/', ctrl.getAll) // publik, dipakai Portal Santri
router.put('/:id', requireAuth, ctrl.update)

module.exports = router
