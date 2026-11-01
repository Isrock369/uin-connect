const { pool } = require('../config/db')
const fields = 'id, judul, kategori, deskripsi, konten, tanggal_dibuat AS tanggalDibuat, file_name AS fileName'

function input(body) {
  const values = ['judul', 'kategori', 'deskripsi', 'konten'].map(key => body?.[key])
  const limits = [150, 50, 255, 16000]
  if (values.some((value, index) => typeof value !== 'string' || value.length > limits[index] || (index < 3 && !value.trim()))) {
    throw Object.assign(new Error('Judul, kategori, deskripsi atau konten tidak valid.'), { status: 400 })
  }
  let file
  if (body.file === null) file = { name: null, data: null }
  else if (body.file !== undefined) {
    const { name, data } = body.file || {}
    if (typeof name !== 'string' || !/^[^/\\\x00-\x1f]{1,180}\.pdf$/i.test(name) ||
        typeof data !== 'string' || data.length > 6990508 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
      throw Object.assign(new Error('Unggah file PDF maksimal 5 MB.'), { status: 400 })
    }
    const buffer = Buffer.from(data, 'base64')
    if (!buffer.length || buffer.length > 5 * 1024 * 1024 || buffer.toString('base64') !== data ||
        buffer.subarray(0, 5).toString() !== '%PDF-' || !buffer.subarray(-1024).includes(Buffer.from('%%EOF'))) {
      throw Object.assign(new Error('Isi file PDF tidak valid atau melebihi 5 MB.'), { status: 400 })
    }
    file = { name, data: buffer }
  }
  return { values: values.map(value => value.trim()), file }
}

async function getAll(req, res) {
  const [rows] = await pool.query('SELECT ' + fields + ' FROM modul_edukasi ORDER BY tanggal_dibuat DESC, id DESC')
  res.json(rows.map(row => ({ ...row, id: String(row.id) })))
}

async function create(req, res) {
  const { values, file } = input(req.body)
  const [result] = await pool.query(
    'INSERT INTO modul_edukasi (judul, kategori, deskripsi, konten, tanggal_dibuat, file_name, file_data) VALUES (?, ?, ?, ?, CURRENT_DATE(), ?, ?)',
    [...values, file?.name ?? null, file?.data ?? null])
  res.status(201).json({ id: result.insertId })
}

async function update(req, res) {
  const { values, file } = input(req.body)
  const [result] = await pool.query(
    'UPDATE modul_edukasi SET judul=?, kategori=?, deskripsi=?, konten=?' +
    (file ? ', file_name=?, file_data=?' : '') + ' WHERE id=?',
    [...values, ...(file ? [file.name, file.data] : []), req.params.id])
  if (!result.affectedRows) return res.status(404).json({ message: 'Panduan tidak ditemukan.' })
  res.json({ message: 'Panduan diperbarui.' })
}

async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM modul_edukasi WHERE id=?', [req.params.id])
  if (!result.affectedRows) return res.status(404).json({ message: 'Panduan tidak ditemukan.' })
  res.json({ message: 'Panduan dihapus.' })
}

async function download(req, res) {
  const [rows] = await pool.query('SELECT file_name, file_data FROM modul_edukasi WHERE id=?', [req.params.id])
  if (!rows[0]?.file_data) return res.status(404).json({ message: 'File panduan tidak ditemukan.' })
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': "attachment; filename= panduan.pdf; filename*=UTF-8''" + encodeURIComponent(rows[0].file_name),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "sandbox"
  })
  res.send(rows[0].file_data)
}

module.exports = { getAll, create, update, remove, download }
