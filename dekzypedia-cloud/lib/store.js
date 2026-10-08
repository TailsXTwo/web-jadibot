// Penyimpanan JSON sederhana (tanpa dependency). Tulis atomik + ditunda 300ms.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

class Store {
  constructor(dir) {
    fs.mkdirSync(dir, { recursive: true })
    this.file = path.join(dir, 'database.json')
    this.data = { users: {}, sessions: {}, chat: [], stats: { days: {}, totalMessages: 0 } }
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'))
      this.data = Object.assign(this.data, raw)
    } catch (e) { /* file baru */ }
    this.timer = null
    this.rebuild()
  }
  rebuild() {
    this.byName = new Map()
    for (const u of Object.values(this.data.users)) this.byName.set(u.username.toLowerCase(), u.id)
  }
  id(prefix = 'u') { return prefix + crypto.randomBytes(4).toString('hex') }
  userByName(name) { const id = this.byName.get(String(name).toLowerCase()); return id ? this.data.users[id] : null }
  addUser(u) { this.data.users[u.id] = u; this.byName.set(u.username.toLowerCase(), u.id); this.save() }
  save() {
    if (this.timer) return
    this.timer = setTimeout(() => { this.timer = null; this.flush() }, 300)
  }
  flush() {
    const tmp = this.file + '.tmp'
    fs.writeFileSync(tmp, JSON.stringify(this.data))
    fs.renameSync(tmp, this.file)
  }
}
module.exports = Store
