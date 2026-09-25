const router = require('express').Router()
const ctrl = require('../controllers/katalog.controller')
const { requireAuth } = require('../middleware/auth')

router.get('/', ctrl.getAll) // publik: boleh ditampilkan di Portal Santri juga kalau nanti dibutuhkan
router.post('/', requireAuth, ctrl.create)
router.put('/:id', requireAuth, ctrl.update)
router.delete('/:id', requireAuth, ctrl.remove)

module.exports = router
