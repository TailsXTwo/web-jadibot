const crypto = require('crypto')

const scrypt = (pw, salt) => new Promise((res, rej) =>
  crypto.scrypt(pw, salt, 32, { N: 16384 }, (e, k) => (e ? rej(e) : res(k))))

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(pw, salt)
  return salt.toString('hex') + ':' + key.toString('hex')
}
async function verifyPassword(pw, stored) {
  const [saltHex, keyHex] = String(stored).split(':')
  if (!saltHex || !keyHex) return false
  const key = await scrypt(pw, Buffer.from(saltHex, 'hex'))
  const good = Buffer.from(keyHex, 'hex')
  return good.length === key.length && crypto.timingSafeEqual(good, key)
}

class Auth {
  constructor(store, cfg) { this.store = store; this.cfg = cfg }
  newSession(userId) {
    const token = crypto.randomBytes(32).toString('hex')
    this.store.data.sessions[token] = { uid: userId, exp: Date.now() + this.cfg.SESSION_DAYS * 864e5 }
    this.store.save()
    return token
  }
  destroy(token) { delete this.store.data.sessions[token]; this.store.save() }
  userFromToken(token) {
    if (!token) return null
    const s = this.store.data.sessions[token]
    if (!s) return null
    if (s.exp < Date.now()) { this.destroy(token); return null }
    return this.store.data.users[s.uid] || null
  }
  isAdmin(user) { return !!user && this.cfg.ADMINS.map(a => a.toLowerCase()).includes(user.username.toLowerCase()) }
  cleanup() {
    const now = Date.now()
    for (const [t, s] of Object.entries(this.store.data.sessions)) if (s.exp < now) delete this.store.data.sessions[t]
    this.store.save()
  }
}
module.exports = { Auth, hashPassword, verifyPassword }
