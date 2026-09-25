// Hashing password TANPA dependency eksternal (pakai modul bawaan Node: crypto)
// supaya tidak ada masalah kompilasi native binding (seperti bcrypt) di hosting terbatas.
const crypto = require('crypto')

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(plainPassword, stored) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuffer = Buffer.from(hash, 'hex')
  const suppliedHash = crypto.scryptSync(plainPassword, salt, 64)
  // timingSafeEqual butuh panjang buffer yang sama
  if (hashBuffer.length !== suppliedHash.length) return false
  return crypto.timingSafeEqual(hashBuffer, suppliedHash)
}

module.exports = { hashPassword, verifyPassword }
