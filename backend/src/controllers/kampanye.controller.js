const { pool } = require('../config/db')

function mapRow(r) {
  return {
    id: r.id,
    mitra: r.mitra,
    logoEmoji: r.logo_emoji,
    judulKampanye: r.judul_kampanye,
    deskripsi: r.deskripsi,
    jenisSampah: typeof r.jenis_sampah === 'string' ? JSON.parse(r.jenis_sampah) : r.jenis_sampah,
    minimalBerat: Number(r.minimal_berat) || 0,
    bonusKeterangan: r.bonus_keterangan,
    periodeMultai: r.periode_mulai,
    periodeSelesai: r.periode_selesai,
    status: r.status,
    kontak: r.kontak,
    syarat: r.syarat,
  }
}

async function getAll(req, res) {
  const [rows] = await pool.query('SELECT * FROM kampanye_mitra ORDER BY periode_mulai DESC')
  res.json(rows.map(mapRow))
}

async function create(req, res) {
  const b = req.body
  const [result] = await pool.query(
    `INSERT INTO kampanye_mitra
     (mitra, logo_emoji, judul_kampanye, deskripsi, jenis_sampah, minimal_berat, bonus_keterangan, periode_mulai, periode_selesai, status, kontak, syarat)
     VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?)`,
    [b.mitra, b.logoEmoji || '🌿', b.judulKampanye, b.deskripsi, JSON.stringify(b.jenisSampah || []), Number(b.minimalBerat) || 0,
     b.bonusKeterangan, b.periodeMultai, b.periodeSelesai, b.status, b.kontak, b.syarat]
  )
  res.status(201).json({ id: result.insertId })
}

async function update(req, res) {
  const b = req.body
  await pool.query(
    `UPDATE kampanye_mitra SET mitra=?, logo_emoji=?, judul_kampanye=?, deskripsi=?, jenis_sampah=CAST(? AS JSON), minimal_berat=?,
     bonus_keterangan=?, periode_mulai=?, periode_selesai=?, status=?, kontak=?, syarat=? WHERE id=?`,
    [b.mitra, b.logoEmoji || '🌿', b.judulKampanye, b.deskripsi, JSON.stringify(b.jenisSampah || []), Number(b.minimalBerat) || 0,
     b.bonusKeterangan, b.periodeMultai, b.periodeSelesai, b.status, b.kontak, b.syarat, req.params.id]
  )
  res.json({ message: 'Kampanye berhasil diperbarui.' })
}

async function remove(req, res) {
  await pool.query('DELETE FROM kampanye_mitra WHERE id = ?', [req.params.id])
  res.json({ message: 'Kampanye berhasil dihapus.' })
}

// Bungkus handler agar error database tidak mematikan server
function safe(fn, pesan) {
  return async (req, res) => {
    try {
      await fn(req, res)
    } catch (err) {
      console.error('[kampanye]', err.sqlMessage || err.message)
      res.status(500).json({ message: pesan })
    }
  }
}

module.exports = {
  getAll: safe(getAll, 'Gagal memuat kampanye.'),
  create: safe(create, 'Gagal menyimpan kampanye.'),
  update: safe(update, 'Gagal memperbarui kampanye.'),
  remove: safe(remove, 'Gagal menghapus kampanye.'),
}
