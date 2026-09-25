const router = require('express').Router()
const ctrl = require('../controllers/verifikasiSetoran.controller')

// PUBLIK — dipakai Portal Santri untuk menghitung estimasi poin dari berat & jenis sampah
router.post('/', ctrl.verifikasi)

module.exports = router
