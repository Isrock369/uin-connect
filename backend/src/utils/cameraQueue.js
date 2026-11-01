const { InputError } = require('./transaction')

// Satu stasiun fisik: jangan mengambil foto setoran lain ketika sampah lama
// masih menunggu foto. Lock device dipakai semua proses server.
async function lockDevice(conn) {
  const [[device]] = await conn.query('SELECT id, last_seen >= NOW(3) - INTERVAL 6 SECOND AS online FROM camera_device WHERE id = 1 FOR UPDATE')
  if (!device) throw new Error('Migrasi camera_device belum dijalankan')
  await conn.query("UPDATE camera_jobs SET status = 'expired' WHERE (status = 'pending' AND expires_at <= NOW(3)) OR (status = 'claimed' AND lease_until <= NOW(3))")
  return Boolean(device.online)
}
async function enqueue(conn, setoranId) {
  const online = await lockDevice(conn)
  const [[existing]] = await conn.query('SELECT status FROM camera_jobs WHERE setoran_id = ?', [setoranId])
  if (existing) return { kameraOnline: online, status: existing.status }
  const [[photo]] = await conn.query('SELECT setoran_id FROM setoran_foto WHERE setoran_id = ?', [setoranId])
  if (photo) return { kameraOnline: online, status: 'done' }
  const [[busy]] = await conn.query("SELECT setoran_id FROM camera_jobs WHERE status IN ('pending','claimed') LIMIT 1")
  if (busy) throw new InputError('Kamera sedang memproses setoran sebelumnya. Tunggu hingga selesai sebelum mengirim setoran baru.', 409)
  const [result] = await conn.query(`INSERT INTO camera_jobs (setoran_id, expires_at)
    SELECT id, created_at + INTERVAL 30 SECOND FROM setoran
    WHERE id = ? AND status = 'menunggu' AND created_at > NOW() - INTERVAL 30 SECOND`, [setoranId])
  if (!result.affectedRows) throw new InputError('Waktu pengambilan foto setoran ini sudah habis.', 409)
  return { kameraOnline: online, status: 'pending' }
}
module.exports = { lockDevice, enqueue }
