const router = require('express').Router()
const ctrl = require('../controllers/timbangan.controller')

router.get('/', ctrl.baca)     // PUBLIK: dibaca Portal Santri
router.post('/', ctrl.terima)  // khusus ESP32, dijaga header X-Device-Key

module.exports = router
