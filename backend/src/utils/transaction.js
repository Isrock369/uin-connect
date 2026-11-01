const crypto = require('crypto')
const { pool } = require('../config/db')

class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}
function number(value, name, max = 4294967295, decimals = 0) {
  if (!['number', 'string'].includes(typeof value) || !/^\d+(\.\d+)?$/.test(String(value))) throw new InputError(`${name} harus berupa angka positif.`)
  const n = Number(value), scale = 10 ** decimals
  if (!Number.isFinite(n) || n <= 0 || n > max || Math.abs(n * scale - Math.round(n * scale)) > 0.000001) throw new InputError(`${name} maksimal ${max}, dengan ${decimals} angka desimal.`)
  return Math.round(n * scale) / scale
}
function text(value, name, max) {
  if (typeof value !== 'string' || !value.trim() || Array.from(value.trim()).length > max) throw new InputError(`${name} wajib diisi, maksimal ${max} karakter.`)
  return value.trim()
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01') throw new InputError('Tanggal tidak valid.')
  const d = new Date(value + 'T00:00:00Z')
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) throw new InputError('Tanggal tidak valid.')
  return value
}

// Reservasi kunci, perubahan saldo/stok, dan hasil API disimpan dalam transaksi yang sama.
// Baris kunci yang belum commit tidak pernah dianggap sebagai transaksi selesai.
async function run(req, res, scope, normalize, action) {
  let conn
  try {
    const data = normalize(req.body || {})
    const key = req.body?.requestId
    if (key !== undefined && (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(key))) throw new InputError('requestId tidak valid.')
    const owner = `${scope}:${req.user?.id || 'public'}`
    const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
    conn = await pool.getConnection()
    await conn.beginTransaction()
    if (key) {
      try {
        await conn.query('INSERT INTO transaction_requests (scope, request_key, payload_hash) VALUES (?, ?, ?)', [owner, key, hash])
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') throw e
        const [[saved]] = await conn.query('SELECT payload_hash, response_json FROM transaction_requests WHERE scope = ? AND request_key = ? FOR UPDATE', [owner, key])
        if (!saved || saved.payload_hash !== hash) throw new InputError('Kunci transaksi sudah dipakai untuk data berbeda.', 409)
        const response = typeof saved.response_json === 'string' ? JSON.parse(saved.response_json) : saved.response_json
        if (!response) throw new InputError('Transaksi belum selesai. Coba kembali dengan data yang sama.', 409)
        await conn.commit()
        return res.status(201).json(response)
      }
    }
    const response = await action(conn, data)
    if (key) await conn.query('UPDATE transaction_requests SET response_json = ? WHERE scope = ? AND request_key = ?', [JSON.stringify(response), owner, key])
    await conn.commit()
    return res.status(201).json(response)
  } catch (e) {
    if (conn) await conn.rollback().catch(() => {})
    if (!(e instanceof InputError)) console.error('Transaksi gagal:', e.code || e.message)
    return res.status(e instanceof InputError ? e.status : 500).json({ message: e instanceof InputError ? e.message : 'Transaksi belum dapat dikonfirmasi. Coba lagi dengan data yang sama.' })
  } finally { if (conn) conn.release() }
}
module.exports = { InputError, number, text, date, run }
