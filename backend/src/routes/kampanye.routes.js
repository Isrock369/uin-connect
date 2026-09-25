const router = require('express').Router()
const ctrl = require('../controllers/kampanye.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/', ctrl.getAll) // publik
router.post('/', requireAuth, ctrl.create)
router.put('/:id', requireAuth, ctrl.update)
router.delete('/:id', requireAuth, ctrl.remove)

module.exports = router
