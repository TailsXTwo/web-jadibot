// Chat global: semua user di satu ruangan. Realtime lewat Server-Sent Events.
class Chat {
  constructor(store, cfg) {
    this.store = store; this.cfg = cfg
    this.clients = new Set()          // { res, uid, username }
    this.last = new Map()             // uid -> waktu pesan terakhir
    this.minute = []                  // stempel waktu pesan (untuk grafik)
    setInterval(() => this.clients.forEach(c => c.res.write(': ping\n\n')), 25000).unref()
  }
  history(limit = 80) { return this.store.data.chat.slice(-limit) }
  send(user, text, isAdmin) {
    text = String(text || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
    if (!text) return { error: 'Pesan kosong.' }
    if (text.length > this.cfg.CHAT_MAX_LEN) return { error: `Maksimal ${this.cfg.CHAT_MAX_LEN} karakter.` }
    const now = Date.now()
    if (now - (this.last.get(user.id) || 0) < this.cfg.CHAT_COOLDOWN_MS) return { error: 'Terlalu cepat, tunggu sebentar.' }
    this.last.set(user.id, now)
    const msg = { id: this.store.id('m'), uid: user.id, username: user.username, text, ts: now, admin: !!isAdmin }
    const list = this.store.data.chat
    list.push(msg)
    if (list.length > this.cfg.CHAT_KEEP) list.splice(0, list.length - this.cfg.CHAT_KEEP)
    const st = this.store.data.stats
    const day = new Date().toISOString().slice(0, 10)
    st.days[day] = (st.days[day] || 0) + 1
    for (const d of Object.keys(st.days).sort().slice(0, -8)) delete st.days[d]
    st.totalMessages++
    this.minute.push(now)
    this.store.save()
    this.broadcast('message', msg)
    return { msg }
  }
  remove(id, user, isAdmin) {
    const list = this.store.data.chat
    const i = list.findIndex(m => m.id === id)
    if (i < 0) return { error: 'Pesan tidak ditemukan.' }
    if (!isAdmin && list[i].uid !== user.id) return { error: 'Tidak boleh menghapus pesan orang lain.' }
    list.splice(i, 1); this.store.save()
    this.broadcast('delete', { id })
    return { ok: true }
  }
  online() { return new Set([...this.clients].map(c => c.uid)).size }
  onlineUsers() { return [...new Set([...this.clients].map(c => c.username))].sort() }
  broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    this.clients.forEach(c => c.res.write(payload))
  }
  presence() { this.broadcast('presence', { count: this.online(), users: this.onlineUsers() }) }
  attach(req, res, user) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive', 'X-Accel-Buffering': 'no'
    })
    res.write('retry: 3000\n\n')
    const c = { res, uid: user.id, username: user.username }
    this.clients.add(c)
    this.presence()
    req.on('close', () => { this.clients.delete(c); this.presence() })
  }
  perMinute(buckets = 30) {
    const now = Date.now(), out = new Array(buckets).fill(0)
    this.minute = this.minute.filter(t => now - t < buckets * 60000)
    for (const t of this.minute) out[buckets - 1 - Math.floor((now - t) / 60000)]++
    return out
  }
}
module.exports = Chat
