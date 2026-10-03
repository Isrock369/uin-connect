const crypto = require('crypto')

// Bacaan terakhir dari timbangan IoT (ESP32), disimpan di memori server.
// Cukup untuk 1 timbangan. Kalau server restart, nilainya kosong sampai ESP32 kirim lagi.
const KADALUARSA_MS = 4000 // ESP32 dianggap offline kalau tidak kirim data selama ini

let terakhir = { berat: 0, stabil: false, sensorOk: false, diterimaPada: 0 }

function kunciCocok(dikirim) {
  const kunci = process.env.TIMBANGAN_KEY || ''
  if (!kunci || !dikirim) return false
  const a = Buffer.from(String(dikirim))
  const b = Buffer.from(kunci)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// POST /api/timbangan  (khusus ESP32 — wajib header X-Device-Key)
// Body: { berat: 1.54, stabil: true, sensorOk: true }
function terima(req, res) {
  if (!process.env.TIMBANGAN_KEY) {
    return res.status(503).json({ message: 'TIMBANGAN_KEY belum diatur di server.' })
  }
  if (!kunciCocok(req.get('x-device-key'))) {
    return res.status(401).json({ message: 'Kunci perangkat salah.' })
  }

  const berat = Number(req.body?.berat)
  if (!Number.isFinite(berat) || berat < -5 || berat > 50) {
    return res.status(400).json({ message: 'berat tidak valid.' })
  }

  terakhir = {
    berat: Math.round(berat * 100) / 100,
    stabil: req.body.stabil === true,
    sensorOk: req.body.sensorOk !== false,
    diterimaPada: Date.now(),
  }
  res.json({ ok: true })
}

// GET /api/timbangan  (PUBLIK — dibaca Portal Santri saat santri menimbang)
// Response: { berat, stabil, status, sensorOk, online, umurMs }
function baca(req, res) {
  const umurMs = terakhir.diterimaPada ? Date.now() - terakhir.diterimaPada : null
  const online = umurMs !== null && umurMs < KADALUARSA_MS

  res.set('Cache-Control', 'no-store')
  res.json({
    berat: online ? terakhir.berat : 0,
    stabil: online && terakhir.stabil,
    status: online && terakhir.stabil ? 'stabil' : 'mengukur',
    sensorOk: online && terakhir.sensorOk,
    online,
    umurMs,
  })
}

module.exports = { terima, baca }
