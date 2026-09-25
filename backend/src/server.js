require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { testConnection } = require('./config/db')

const authRoutes = require('./routes/auth.routes')
const asramaRoutes = require('./routes/asrama.routes')
const kamarRoutes = require('./routes/kamar.routes')
const tarifSampahRoutes = require('./routes/tarifSampah.routes')
const setoranRoutes = require('./routes/setoran.routes')
const verifikasiSetoranRoutes = require('./routes/verifikasiSetoran.routes')
const katalogRoutes = require('./routes/katalog.routes')
const penukaranRoutes = require('./routes/penukaran.routes')
const penjualanRoutes = require('./routes/penjualan.routes')
const kasRoutes = require('./routes/kas.routes')
const modulRoutes = require('./routes/modul.routes')
const kampanyeRoutes = require('./routes/kampanye.routes')
const laporanRoutes = require('./routes/laporan.routes')
const dataRoutes = require('./routes/data.routes')

const app = express()

// Izinkan akses dari WEBSITE (admin, perlu login) dan PORTAL SANTRI (kiosk, publik).
// Untuk development, Vite bisa otomatis pindah ke port 5175/5176 jika port default sudah dipakai.
const allowedOrigins = [
  process.env.CORS_ORIGIN_WEBSITE || 'http://localhost:5173',
  process.env.CORS_ORIGIN_PORTAL || 'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):517\d+$/.test(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Origin tidak diizinkan oleh CORS'))
  },
}))
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok', waktu: new Date().toISOString() }))

app.use('/api/auth', authRoutes)
app.use('/api/asrama', asramaRoutes)
app.use('/api/kamar', kamarRoutes)
app.use('/api/tarif-sampah', tarifSampahRoutes)
app.use('/api/setoran', setoranRoutes)         // <- endpoint yang dipakai Portal Santri untuk kirim setoran
app.use('/api/verifikasi-setoran', verifikasiSetoranRoutes) // <- endpoint hitung estimasi poin (jenis + berat) untuk Portal Santri
app.use('/api/katalog', katalogRoutes)
app.use('/api/penukaran', penukaranRoutes)
app.use('/api/penjualan', penjualanRoutes)
app.use('/api/kas', kasRoutes)
app.use('/api/modul', modulRoutes)
app.use('/api/kampanye', kampanyeRoutes)
app.use('/api/laporan', laporanRoutes)
app.use('/api/data', dataRoutes)         // <- endpoint generik untuk ambil data mentah dari tabel MySQL

// Handler error generik
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`🚀 Backend Bank Sampah Pesantren jalan di http://localhost:${PORT}`)
  testConnection()
})
