const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/kamera.controller')
const { requireAuth } = require('../middleware/auth')

router.post('/minta', ctrl.minta)                 // PUBLIK: Portal Santri
router.get('/tugas', ctrl.tugasUntukKamera)       // ESP32-CAM (X-Device-Key)
router.post('/foto', express.raw({ type: 'image/jpeg', limit: '600kb' }), ctrl.terimaFoto) // ESP32-CAM (X-Device-Key)
router.get('/hasil/:setoranId', ctrl.hasil)       // PUBLIK: Portal menunggu foto
router.get('/foto-ada', requireAuth, ctrl.fotoAda)           // Website admin
router.get('/foto/:setoranId', requireAuth, ctrl.fotoGambar) // Website admin

module.exports = router
