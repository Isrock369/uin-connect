const router = require('express').Router()
const { requireAuth } = require('../middleware/auth')
const ctrl = require('../controllers/asisten.controller')
router.use(requireAuth)
router.get('/pilihan', ctrl.options)
router.get('/jawaban', ctrl.answer)
router.post('/pertanyaan', ctrl.question)
module.exports = router
