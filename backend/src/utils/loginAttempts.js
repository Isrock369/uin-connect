const { pool } = require('../config/db')

const MAX_ATTEMPTS = 5
const WINDOW_SECONDS = 15 * 60
let tableReady

async function ensureTable() {
  if (!tableReady) {
    tableReady = pool.query(`CREATE TABLE IF NOT EXISTS auth_login_attempts (
      bucket VARCHAR(80) NOT NULL PRIMARY KEY,
      attempts INT UNSIGNED NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL
    ) ENGINE=InnoDB`).catch((err) => {
      tableReady = null
      throw err
    })
  }
  await tableReady
}

async function reserveLoginAttempt(bucket) {
  await ensureTable()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query(
      `INSERT INTO auth_login_attempts (bucket, attempts, expires_at)
       VALUES (?, 0, DATE_ADD(NOW(), INTERVAL ? SECOND))
       ON DUPLICATE KEY UPDATE bucket = VALUES(bucket)`,
      [bucket, WINDOW_SECONDS]
    )
    const [[entry]] = await conn.query(
      'SELECT attempts, TIMESTAMPDIFF(SECOND, NOW(), expires_at) AS remaining FROM auth_login_attempts WHERE bucket = ? FOR UPDATE',
      [bucket]
    )
    if (entry.remaining <= 0) {
      await conn.query(
        'UPDATE auth_login_attempts SET attempts = 1, expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE bucket = ?',
        [WINDOW_SECONDS, bucket]
      )
    } else if (entry.attempts >= MAX_ATTEMPTS) {
      await conn.commit()
      return Math.max(1, entry.remaining)
    } else {
      await conn.query('UPDATE auth_login_attempts SET attempts = attempts + 1 WHERE bucket = ?', [bucket])
    }
    await conn.commit()
    return 0
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function clearLoginAttempts(bucket) {
  await pool.query('DELETE FROM auth_login_attempts WHERE bucket = ?', [bucket])
}

module.exports = { reserveLoginAttempt, clearLoginAttempts }
