const crypto = require('node:crypto');

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}

function hashPasswordResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { createPasswordResetToken, hashPasswordResetToken };
