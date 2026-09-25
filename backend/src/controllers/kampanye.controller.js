const { pool } = require('../config/db')

function mapRow(r) {
  return {
    id: r.id,
    mitra: r.mitra,
    logoEmoji: r.logo_emoji,
    judulKampanye: r.judul_kampanye,
    deskripsi: r.deskripsi,
    jenisSampah: typeof r.jenis_sampah === 'string' ? JSON.parse(r.jenis_sampah) : r.jenis_sampah,
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
     (mitra, logo_emoji, judul_kampanye, deskripsi, jenis_sampah, bonus_keterangan, periode_mulai, periode_selesai, status, kontak, syarat)
     VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?)`,
    [b.mitra, b.logoEmoji, b.judulKampanye, b.deskripsi, JSON.stringify(b.jenisSampah || []),
     b.bonusKeterangan, b.periodeMultai, b.periodeSelesai, b.status, b.kontak, b.syarat]
  )
  res.status(201).json({ id: result.insertId })
}

async function update(req, res) {
  const b = req.body
  await pool.query(
    `UPDATE kampanye_mitra SET mitra=?, logo_emoji=?, judul_kampanye=?, deskripsi=?, jenis_sampah=CAST(? AS JSON),
     bonus_keterangan=?, periode_mulai=?, periode_selesai=?, status=?, kontak=?, syarat=? WHERE id=?`,
    [b.mitra, b.logoEmoji, b.judulKampanye, b.deskripsi, JSON.stringify(b.jenisSampah || []),
     b.bonusKeterangan, b.periodeMultai, b.periodeSelesai, b.status, b.kontak, b.syarat, req.params.id]
  )
  res.json({ message: 'Kampanye berhasil diperbarui.' })
}

async function remove(req, res) {
  await pool.query('DELETE FROM kampanye_mitra WHERE id = ?', [req.params.id])
  res.json({ message: 'Kampanye berhasil dihapus.' })
}

module.exports = { getAll, create, update, remove }
