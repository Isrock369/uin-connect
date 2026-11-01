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

const { lockDevice, enqueue } = require('../utils/cameraQueue')
const { InputError } = require('../utils/transaction')

async function cameraTransaction(res, action) {
  let conn
  try {
    await pastikanTabel()
    conn = await pool.getConnection()
    await conn.beginTransaction()
    const result = await action(conn)
    await conn.commit()
    res.set('Cache-Control', 'no-store')
    return res.json(result)
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {})
    console.error('Kamera:', e.code || e.message)
    return res.status(e instanceof InputError ? e.status : 500).json({ message: e instanceof InputError ? e.message : 'Gagal memproses kamera.' })
  } finally { if (conn) conn.release() }
}

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
  if (!['number', 'string'].includes(typeof nilai) || !/^[1-9][0-9]*$/.test(String(nilai))) return null
  const id = Number(nilai)
  return Number.isSafeInteger(id) && id <= 4294967295 ? id : null
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
      await pool.query(
        `CREATE TABLE IF NOT EXISTS setoran_foto (${kolom},
          CONSTRAINT fk_foto_setoran FOREIGN KEY (setoran_id) REFERENCES setoran(id)
          ON UPDATE CASCADE ON DELETE CASCADE) ENGINE=InnoDB`
      )
    })()
    tabelSiap.catch(() => { tabelSiap = null }) // gagal -> coba lagi di permintaan berikutnya
  }
  return tabelSiap
}

// POST /api/kamera/minta  (PUBLIK — dipanggil Portal Santri setelah setoran tercatat)
// Body: { setoranId }   Response: { kameraOnline }
async function minta(req, res) {
  const id = ambilId(req.body?.setoranId)
  if (!id) return res.status(400).json({ message: 'setoranId tidak valid.' })
  return cameraTransaction(res, conn => enqueue(conn, id))
}

async function tugasUntukKamera(req, res) {
  if (!cekPerangkat(req, res)) return
  return cameraTransaction(res, async conn => {
    await lockDevice(conn)
    await conn.query('UPDATE camera_device SET last_seen = NOW(3) WHERE id = 1')
    const [[busy]] = await conn.query("SELECT setoran_id FROM camera_jobs WHERE status = 'claimed' LIMIT 1")
    if (busy) return { ada: false }
    const [[job]] = await conn.query("SELECT setoran_id FROM camera_jobs WHERE status = 'pending' ORDER BY created_at, setoran_id LIMIT 1 FOR UPDATE")
    if (!job) return { ada: false }
    await conn.query("UPDATE camera_jobs SET status = 'claimed', lease_until = NOW(3) + INTERVAL 60 SECOND WHERE setoran_id = ?", [job.setoran_id])
    return { ada: true, setoranId: job.setoran_id }
  })
}

async function terimaFoto(req, res) {
  if (!cekPerangkat(req, res)) return
  const id = ambilId(req.query.setoranId)
  if (!id) return res.status(400).json({ message: 'setoranId tidak valid.' })
  const foto = req.body
  if (!Buffer.isBuffer(foto) || foto.length <= 100 || foto.length > 600 * 1024 || foto[0] !== 0xff || foto[1] !== 0xd8 || foto[foto.length - 2] !== 0xff || foto[foto.length - 1] !== 0xd9) {
    return res.status(400).json({ message: 'Body harus JPEG utuh, maksimal 600 KB.' })
  }
  return cameraTransaction(res, async conn => {
    await lockDevice(conn)
    const [[job]] = await conn.query('SELECT status FROM camera_jobs WHERE setoran_id = ?', [id])
    if (job?.status === 'done') return { ok: true } // retry JPEG tidak menimpa foto bukti
    if (job?.status !== 'claimed') throw new InputError('Tugas foto tidak aktif atau sudah kedaluwarsa.', 409)
    await conn.query('INSERT INTO setoran_foto (setoran_id, foto, ukuran) VALUES (?, ?, ?)', [id, foto, foto.length])
    await conn.query("UPDATE camera_jobs SET status = 'done' WHERE setoran_id = ?", [id])
    return { ok: true, ukuran: foto.length }
  })
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
    const [[job]] = await pool.query(`SELECT CASE
      WHEN status = 'pending' AND expires_at <= NOW(3) THEN 'expired'
      WHEN status = 'claimed' AND lease_until <= NOW(3) THEN 'expired'
      ELSE status END AS status FROM camera_jobs WHERE setoran_id = ?`, [id])
    res.json({ ada: rows.length > 0, status: rows.length ? 'done' : (job?.status || 'none') })
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
