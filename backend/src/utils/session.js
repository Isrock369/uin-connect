const crypto = require('crypto')

function credentialVersion(passwordHash) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(passwordHash).digest('hex')
}

module.exports = { credentialVersion }
