// Pakai:  node scripts/reset-password.js <username> <passwordBaru>
// Jalankan saat server MATI (atau restart setelahnya).
const config = require('../config')
const Store = require('../lib/store')
const { hashPassword } = require('../lib/auth')

;(async () => {
  const [name, pw] = process.argv.slice(2)
  if (!name || !pw) return console.log('Pakai: node scripts/reset-password.js <username> <passwordBaru>')
  const store = new Store(config.server.DATA_DIR)
  const u = store.userByName(name)
  if (!u) return console.log('User tidak ditemukan:', name)
  u.hash = await hashPassword(pw)
  Object.keys(store.data.sessions).forEach(t => { if (store.data.sessions[t].uid === u.id) delete store.data.sessions[t] })
  store.flush()
  console.log(`Password ${u.username} berhasil diganti.`)
})()
