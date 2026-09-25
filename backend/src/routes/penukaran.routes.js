const router = require('express').Router()
const ctrl = require('../controllers/penukaran.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/', requireAuth, ctrl.getAll)
router.post('/', requireAuth, ctrl.create)

module.exports = router
