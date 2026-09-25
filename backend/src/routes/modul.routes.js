const router = require('express').Router()
const ctrl = require('../controllers/modul.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/', ctrl.getAll) // publik: boleh dibaca siapa saja
router.post('/', requireAuth, ctrl.create)
router.put('/:id', requireAuth, ctrl.update)
router.delete('/:id', requireAuth, ctrl.remove)

module.exports = router
