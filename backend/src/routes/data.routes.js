const router = require('express').Router()
const ctrl = require('../controllers/data.controller')

// GET /api/data              -> ringkasan data dari semua tabel
// GET /api/data/:table       -> seluruh baris dari satu tabel tertentu
router.get('/', ctrl.getAll)
router.get('/:table', ctrl.getByTable)

module.exports = router
