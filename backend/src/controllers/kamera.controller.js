const crypto = require('crypto')
const { pool } = require('../config/db')

// ESP32-CAM mengambil foto bukti setoran.
//   1) Portal Santri  -> POST /api/kamera/minta        (publik)  "tolong foto setoran ini"
//   2) ESP32-CAM      -> GET  /api/kamera/tugas        (X-Device-Key) "ada tugas foto?"
//   3) ESP32-CAM      -> POST /api/kamera/foto?setoranId=N (X-Device-Key, body JPEG)
//   4) Portal         -> GET  /api/kamera/hasil/:id    (publik)  "fotonya sudah masuk?"
//   5) Website admin  -> GET  /api/kamera/foto-ada     (login)   daftar setoran yang punya foto
//                        GET  /api/kamera/foto/:id     (login)   gambar JPEG-nya
// Kunci perangkat memakai TIMBANGAN_KEY yang sama dengan timbangan.

const TUGAS_KADALUARSA_MS = 30000 // tugas foto dibatalkan kalau kamera tidak mengambilnya
const KAMERA_ONLINE_MS = 6000     // kamera dianggap offline kalau tidak menanyakan tugas selama ini
const SETORAN_BARU_MENIT = 3      // hanya setoran yang baru dibuat yang boleh diminta fotonya

let tugas = null        // { setoranId, dibuatPada, diambil }
let terakhirLihat = 0   // kapan kamera terakhir menanyakan tugas

function kunciCocok(dikirim) {
  const kunci = process.env.TIMBANGAN_KEY || ''
  if (!kunci || !dikirim) return false
  const a = Buffer.from(String(dikirim))
  const b = Buffer.from(kunci)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Mengembalikan true kalau perangkat sah. Kalau tidak, sudah membalas error ke klien.
function cekPerangkat(req, res) {
  if (!process.env.TIMBANGAN_KEY) {
    res.status(503).json({ message: 'TIMBANGAN_KEY belum diatur di server.' })
    return false
  }
  if (!kunciCocok(req.get('x-device-key'))) {
    res.status(401).json({ message: 'Kunci perangkat salah.' })
    return false
  }
  return true
}

function ambilId(nilai) {
  const id = Number.parseInt(nilai, 10)
  return Number.isInteger(id) && id > 0 ? id : null
}

// Tabel foto dibuat otomatis, jadi tidak perlu menjalankan SQL manual.
let tabelSiap = null
function pastikanTabel() {
  if (!tabelSiap) {
    const kolom = `
      setoran_id INT UNSIGNED NOT NULL PRIMARY KEY,
      foto       MEDIUMBLOB   NOT NULL,
      ukuran     INT UNSIGNED NOT NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP`
    tabelSiap = (async () => {
      try {
        await pool.query(
          `CREATE TABLE IF NOT EXISTS setoran_foto (${kolom},
             CONSTRAINT fk_foto_setoran FOREIGN KEY (setoran_id) REFERENCES setoran(id)
               ON UPDATE CASCADE ON DELETE CASCADE) ENGINE=InnoDB`
        )
      } catch (err) {
        console.warn('Tabel setoran_foto dibuat tanpa foreign key:', err.message)
        await pool.query(`CREATE TABLE IF NOT EXISTS setoran_foto (${kolom}) ENGINE=InnoDB`)
      }
    })()
    tabelSiap.catch(() => { tabelSiap = null }) // gagal -> coba lagi di permintaan berikutnya
  }
  return tabelSiap
}

// POST /api/kamera/minta  (PUBLIK — dipanggil Portal Santri setelah setoran tercatat)
// Body: { setoranId }   Response: { kameraOnline }
async function minta(req, res) {
  try {
    const id = ambilId(req.body?.setoranId)
    if (!id) return res.status(400).json({ message: 'setoranId tidak valid.' })

    const [rows] = await pool.query(
      `SELECT id FROM setoran
        WHERE id = ? AND status = 'menunggu'
          AND created_at >= NOW() - INTERVAL ${SETORAN_BARU_MENIT} MINUTE`,
      [id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Setoran tidak ditemukan atau sudah lama.' })
    }

    const kameraOnline = Date.now() - terakhirLihat < KAMERA_ONLINE_MS
    if (kameraOnline) tugas = { setoranId: id, dibuatPada: Date.now(), diambil: false }

    res.set('Cache-Control', 'no-store')
    res.json({ kameraOnline })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal meminta foto.' })
  }
}

// GET /api/kamera/tugas  (khusus ESP32-CAM — wajib header X-Device-Key)
// Response: { ada: false }  atau  { ada: true, setoranId: 12 }
function tugasUntukKamera(req, res) {
  if (!cekPerangkat(req, res)) return
  terakhirLihat = Date.now()

  res.set('Cache-Control', 'no-store')
  if (tugas && Date.now() - tugas.dibuatPada > TUGAS_KADALUARSA_MS) tugas = null
  if (tugas && !tugas.diambil) {
    tugas.diambil = true // satu tugas hanya diberikan sekali
    return res.json({ ada: true, setoranId: tugas.setoranId })
  }
  res.json({ ada: false })
}

// POST /api/kamera/foto?setoranId=12  (khusus ESP32-CAM — body: JPEG mentah)
async function terimaFoto(req, res) {
  if (!cekPerangkat(req, res)) return
  try {
    const id = ambilId(req.query.setoranId)
    if (!id) return res.status(400).json({ message: 'setoranId tidak valid.' })

    const foto = req.body
    const jpegValid = Buffer.isBuffer(foto) && foto.length > 100 && foto[0] === 0xff && foto[1] === 0xd8
    if (!jpegValid) return res.status(400).json({ message: 'Body harus berupa gambar JPEG.' })

    await pastikanTabel()
    const [rows] = await pool.query('SELECT id FROM setoran WHERE id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ message: 'Setoran tidak ditemukan.' })

    await pool.query(
      `INSERT INTO setoran_foto (setoran_id, foto, ukuran) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE foto = VALUES(foto), ukuran = VALUES(ukuran), created_at = NOW()`,
      [id, foto, foto.length]
    )
    if (tugas && tugas.setoranId === id) tugas = null

    res.json({ ok: true, ukuran: foto.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal menyimpan foto.' })
  }
}

// GET /api/kamera/hasil/:setoranId  (PUBLIK — Portal menunggu foto masuk)
async function hasil(req, res) {
  try {
    const id = ambilId(req.params.setoranId)
    if (!id) return res.status(400).json({ message: 'setoranId tidak valid.' })
    await pastikanTabel()
    // created_at foto harus >= created_at setoran, supaya foto sisa dari data lama tidak ikut terhitung
    const [rows] = await pool.query(
      `SELECT 1 FROM setoran_foto f JOIN setoran s ON s.id = f.setoran_id
        WHERE f.setoran_id = ? AND f.created_at >= s.created_at`,
      [id]
    )
    res.set('Cache-Control', 'no-store')
    res.json({ ada: rows.length > 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal memeriksa foto.' })
  }
}

// GET /api/kamera/foto-ada  (login — daftar id setoran yang punya foto)
async function fotoAda(req, res) {
  try {
    await pastikanTabel()
    const [rows] = await pool.query(
      `SELECT f.setoran_id AS id FROM setoran_foto f JOIN setoran s ON s.id = f.setoran_id
        WHERE f.created_at >= s.created_at`
    )
    res.json({ ids: rows.map((r) => r.id) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal membaca daftar foto.' })
  }
}

// GET /api/kamera/foto/:setoranId  (login — gambar JPEG)
async function fotoGambar(req, res) {
  try {
    const id = ambilId(req.params.setoranId)
    if (!id) return res.status(400).json({ message: 'setoranId tidak valid.' })
    await pastikanTabel()
    const [rows] = await pool.query(
      `SELECT f.foto FROM setoran_foto f JOIN setoran s ON s.id = f.setoran_id
        WHERE f.setoran_id = ? AND f.created_at >= s.created_at`,
      [id]
    )
    if (rows.length === 0) return res.status(404).json({ message: 'Foto tidak ada.' })
    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'private, max-age=3600')
    res.send(rows[0].foto)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Gagal membaca foto.' })
  }
}

module.exports = { minta, tugasUntukKamera, terimaFoto, hasil, fotoAda, fotoGambar, pastikanTabel }
