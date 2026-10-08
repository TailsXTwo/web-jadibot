// Zeptrine Cloud - server (tanpa dependency, cukup Node.js 18+)
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const config = require('./config')
const Store = require('./lib/store')
const { Auth, hashPassword, verifyPassword } = require('./lib/auth')
const Chat = require('./lib/chat')
const BotManager = require('./lib/bots')
const Engines = require('./lib/engines')
const crypto = require('crypto')
const music = require('./lib/music')

const cfg = config.server
const PUBLIC = path.join(__dirname, 'public')
const started = Date.now()

const store = new Store(cfg.DATA_DIR)
const auth = new Auth(store, cfg)
const chat = new Chat(store, cfg)
const engines = new Engines(cfg, cfg.DATA_DIR)
const bots = new BotManager(cfg, store, engines)

// Kode admin: nama user di ADMINS dicadangkan. Untuk mendaftar sebagai admin, perlu kode ini
// (dibuat otomatis saat server pertama jalan, tampil di console, tersimpan di data/admin.key).
const keyFile = path.join(cfg.DATA_DIR, 'admin.key')
let ADMIN_KEY = cfg.ADMIN_KEY || ''
if (!ADMIN_KEY) {
  try { ADMIN_KEY = fs.readFileSync(keyFile, 'utf8').trim() } catch (e) { /* belum ada */ }
  if (!ADMIN_KEY) { ADMIN_KEY = crypto.randomBytes(5).toString('hex'); fs.writeFileSync(keyFile, ADMIN_KEY) }
}
const sameKey = v => { const a = Buffer.from(String(v || '')), b = Buffer.from(ADMIN_KEY); return a.length === b.length && crypto.timingSafeEqual(a, b) }

/* ------------------------------ util ------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.flac': 'audio/flac', '.aac': 'audio/aac', '.opus': 'audio/ogg', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8'
}
const send = (res, status, obj) => {
  const body = JSON.stringify(obj)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(body)
}
const fail = (res, status, message) => send(res, status, { ok: false, error: message })
const clientIp = req => (cfg.TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?'
const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p[0]).map(p => [p[0], decodeURIComponent(p.slice(1).join('='))]))
const readJson = req => new Promise((resolve, reject) => {
  let size = 0; const chunks = []
  req.on('data', c => { size += c.length; if (size > 20000) { reject(new Error('Body terlalu besar')); req.destroy() } else chunks.push(c) })
  req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}) } catch (e) { reject(new Error('JSON tidak valid')) } })
  req.on('error', reject)
})
const readRaw = (req, limit) => new Promise((resolve, reject) => {
  let size = 0; const chunks = []
  req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('File terlalu besar (maks 200 MB).')); req.destroy() } else chunks.push(c) })
  req.on('end', () => resolve(Buffer.concat(chunks)))
  req.on('error', reject)
})
const setCookie = (req, res, token, maxAgeSec) => {
  const secure = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted
  res.setHeader('Set-Cookie', `lc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`)
}

const hits = new Map()
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 600000)
  arr.push(now); hits.set(ip, arr)
  return arr.length > cfg.AUTH_MAX_TRIES
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 600000)) hits.delete(k) }, 600000).unref()

const publicUser = u => ({ id: u.id, username: u.username, admin: auth.isAdmin(u), createdAt: u.createdAt })
const USER_RE = /^[a-zA-Z0-9_.]+$/

let trackCache = { at: 0, list: [] }
function libraryTracks() {
  if (Date.now() - trackCache.at > 8000) trackCache = { at: Date.now(), list: music.scan(cfg.MUSIC_DIR) }
  return trackCache.list
}

/* ------------------------------ API ------------------------------ */
async function api(req, res, url) {
  const { method } = req
  const p = url.pathname

  // perlindungan CSRF: request tulis harus berasal dari situs ini sendiri.
  // Aman di belakang proxy/Cloudflare/domain: cek Host, X-Forwarded-Host, atau header Sec-Fetch-Site (tak bisa dipalsukan situs lain).
  if (method !== 'GET' && req.headers.origin) {
    let oh = ''
    try { oh = new URL(req.headers.origin).host } catch (e) { /* abaikan */ }
    const hosts = [req.headers.host, String(req.headers['x-forwarded-host'] || '').split(',')[0].trim()].filter(Boolean)
    const site = req.headers['sec-fetch-site']
    const ok = hosts.includes(oh) || site === 'same-origin' || (cfg.ALLOWED_ORIGINS || []).includes(req.headers.origin)
    if (!ok) return fail(res, 403, `Origin ${oh || '?'} tidak diizinkan. Tambahkan ke ALLOWED_ORIGINS di config.js.`)
  }

  const token = cookies(req).lc_session
  const user = auth.userFromToken(token)
  const admin = auth.isAdmin(user)
  const need = () => { if (!user) { fail(res, 401, 'Silakan login dulu.'); return false } return true }

  if (method === 'GET' && p === '/api/config') {
    return send(res, 200, Object.assign({}, config.site, {
      slots: cfg.MAX_TOTAL_BOTS, registerOpen: cfg.REGISTER_OPEN,
      allowUserTracks: cfg.ALLOW_USER_TRACKS, chatMax: cfg.CHAT_MAX_LEN
    }))
  }

  if (method === 'GET' && p === '/api/stats') {
    const day = new Date().toISOString().slice(0, 10)
    const total = os.totalmem(), free = os.freemem()
    return send(res, 200, {
      status: true,
      data: {
        users: Object.keys(store.data.users).length,
        online: chat.online(),
        botsActive: bots.onlineCount(),
        slotsTotal: cfg.MAX_TOTAL_BOTS,
        slotsLeft: bots.slotsLeft(),
        messagesToday: store.data.stats.days[day] || 0,
        messagesTotal: store.data.stats.totalMessages,
        perMinute: chat.perMinute(30),
        uptime: Math.round((Date.now() - started) / 1000),
        load: Number((os.loadavg()[0] / Math.max(1, os.cpus().length) * 100).toFixed(0)),
        memory: Number(((1 - free / total) * 100).toFixed(0)),
        node: process.version
      }
    })
  }

  /* ---------- akun ---------- */
  if (method === 'POST' && (p === '/api/auth/register' || p === '/api/auth/login')) {
    if (limited(clientIp(req))) return fail(res, 429, 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.')
    const b = await readJson(req)
    const username = String(b.username || '').trim(), password = String(b.password || '')
    if (p.endsWith('register')) {
      if (!cfg.REGISTER_OPEN) return fail(res, 403, 'Pendaftaran sedang ditutup.')
      if (username.length < cfg.USERNAME_MIN || username.length > cfg.USERNAME_MAX) return fail(res, 400, `Username ${cfg.USERNAME_MIN}-${cfg.USERNAME_MAX} karakter.`)
      if (!USER_RE.test(username)) return fail(res, 400, 'Username hanya boleh huruf, angka, titik, dan garis bawah.')
      if (password.length < cfg.PASSWORD_MIN || password.length > 100) return fail(res, 400, `Password minimal ${cfg.PASSWORD_MIN} karakter.`)
      if (store.userByName(username)) return fail(res, 409, 'Username sudah dipakai.')
      if (auth.isAdmin({ username }) && !sameKey(b.adminKey)) return fail(res, 403, 'Username ini khusus Owner. Isi kode Owner (lihat console server / data/admin.key).')
      const u = { id: store.id('u'), username, hash: await hashPassword(password), createdAt: Date.now(), likes: [], tracks: [] }
      store.addUser(u)
      setCookie(req, res, auth.newSession(u.id), cfg.SESSION_DAYS * 86400)
      return send(res, 200, { ok: true, user: publicUser(u) })
    }
    const u = store.userByName(username)
    if (!u || !(await verifyPassword(password, u.hash))) return fail(res, 401, 'Username atau password salah.')
    setCookie(req, res, auth.newSession(u.id), cfg.SESSION_DAYS * 86400)
    return send(res, 200, { ok: true, user: publicUser(u) })
  }
  if (method === 'POST' && p === '/api/auth/logout') {
    if (token) auth.destroy(token)
    setCookie(req, res, '', 0)
    return send(res, 200, { ok: true })
  }
  if (method === 'GET' && p === '/api/me') {
    return user ? send(res, 200, { ok: true, user: publicUser(user) }) : fail(res, 401, 'Belum login.')
  }
  if (method === 'POST' && p === '/api/me/password') {
    if (!need()) return
    const b = await readJson(req)
    if (!(await verifyPassword(String(b.old || ''), user.hash))) return fail(res, 400, 'Password lama salah.')
    const np = String(b.new || '')
    if (np.length < cfg.PASSWORD_MIN || np.length > 100) return fail(res, 400, `Password baru minimal ${cfg.PASSWORD_MIN} karakter.`)
    user.hash = await hashPassword(np); store.save()
    return send(res, 200, { ok: true })
  }

  /* ---------- bot ---------- */
  if (p === '/api/bot') {
    if (!need()) return
    if (method === 'GET') return send(res, 200, { ok: true, bot: bots.status(user.id) })
  }
  if (method === 'POST' && p === '/api/bot/connect') {
    if (!need()) return
    const b = await readJson(req)
    const r = bots.connect(user.id, b.number, b.engine)
    return r.error ? fail(res, 400, r.error) : send(res, 200, { ok: true, bot: bots.status(user.id) })
  }
  if (method === 'POST' && p === '/api/bot/stop') {
    if (!need()) return
    bots.stop(user.id)
    return send(res, 200, { ok: true, bot: bots.status(user.id) })
  }
  if (method === 'POST' && p === '/api/bot/logout') {
    if (!need()) return
    bots.logout(user.id)
    return send(res, 200, { ok: true })
  }

  /* ---------- admin: engine bot ---------- */
  if (p.startsWith('/api/admin/')) {
    if (!need()) return
    if (!admin) return fail(res, 403, 'Khusus Owner.')
    const withUsers = () => engines.list().map(e => Object.assign(e, { users: bots.usersOf(e.id), running: bots.runningOf(e.id) }))
    if (method === 'GET' && p === '/api/admin/engines') return send(res, 200, { ok: true, engines: withUsers(), migration: bots.migration })
    if (method === 'POST' && p === '/api/admin/engines/upload') {
      const q = url.searchParams
      const buf = await readRaw(req, 200 * 1024 * 1024)
      if (!buf.length) return fail(res, 400, 'File kosong.')
      try {
        const id = engines.addZip(buf, { name: q.get('name') || 'bot', entry: q.get('entry') || '', prompt: q.get('prompt') || '', codeRegex: q.get('code') || '', mode: q.get('mode') || 'auto' })
        return send(res, 200, { ok: true, id, engines: withUsers() })
      } catch (e) { return fail(res, 400, e.message) }
    }
    if (method === 'POST' && p === '/api/admin/engines/install') { const b = await readJson(req); engines.install(String(b.id)); return send(res, 200, { ok: true, engines: withUsers() }) }
    if (method === 'POST' && p === '/api/admin/engines/active') {
      const b = await readJson(req)
      try {
        engines.setActive(String(b.id))
        if (b.migrate) bots.switchAll(String(b.id))       // pindahkan semua user ke script ini
      } catch (e) { return fail(res, 400, e.message) }
      return send(res, 200, { ok: true, engines: withUsers(), migration: bots.migration })
    }
    const de = p.match(/^\/api\/admin\/engines\/([a-z0-9-]+)$/)
    if (method === 'DELETE' && de) {
      if (bots.usersOf(de[1]) > 0) return fail(res, 400, 'Masih ada user yang tertaut di engine ini.')
      try { engines.remove(de[1]) } catch (e) { return fail(res, 400, e.message) }
      return send(res, 200, { ok: true, engines: withUsers() })
    }
    return fail(res, 404, 'Endpoint tidak ditemukan.')
  }

  /* ---------- chat ---------- */
  if (method === 'GET' && p === '/api/chat/history') {
    if (!need()) return
    return send(res, 200, { ok: true, messages: chat.history(100), online: chat.online(), users: chat.onlineUsers() })
  }
  if (method === 'GET' && p === '/api/chat/stream') {
    if (!need()) return
    return chat.attach(req, res, user)
  }
  if (method === 'POST' && p === '/api/chat/send') {
    if (!need()) return
    const b = await readJson(req)
    const r = chat.send(user, b.text, admin)
    return r.error ? fail(res, 400, r.error) : send(res, 200, { ok: true })
  }
  const del = p.match(/^\/api\/chat\/(m[0-9a-f]+)$/)
  if (method === 'DELETE' && del) {
    if (!need()) return
    const r = chat.remove(del[1], user, admin)
    return r.error ? fail(res, 400, r.error) : send(res, 200, { ok: true })
  }

  /* ---------- musik ---------- */
  if (method === 'GET' && p === '/api/music') {
    return send(res, 200, {
      ok: true, tracks: libraryTracks(),
      likes: user ? user.likes : [], mine: user ? user.tracks : []
    })
  }
  if (method === 'POST' && p === '/api/music/like') {
    if (!need()) return
    const b = await readJson(req)
    const id = String(b.id || '')
    user.likes = user.likes.filter(x => x !== id)
    if (b.on) user.likes.push(id)
    store.save()
    return send(res, 200, { ok: true, likes: user.likes })
  }
  if (method === 'POST' && p === '/api/music/add') {
    if (!need()) return
    if (!cfg.ALLOW_USER_TRACKS) return fail(res, 403, 'Fitur tambah lagu dimatikan.')
    const b = await readJson(req)
    const src = String(b.url || '').trim()
    if (!music.validUrl(src)) return fail(res, 400, 'URL harus diawali http:// atau https://')
    if (user.tracks.length >= 50) return fail(res, 400, 'Maksimal 50 lagu pribadi.')
    const t = {
      id: music.hid(src + user.id), title: String(b.title || 'Tanpa judul').trim().slice(0, 80) || 'Tanpa judul',
      artist: String(b.artist || 'Unknown').trim().slice(0, 60) || 'Unknown', src, cover: ''
    }
    user.tracks.push(t); store.save()
    return send(res, 200, { ok: true, track: t })
  }
  const dm = p.match(/^\/api\/music\/mine\/([0-9a-f]+)$/)
  if (method === 'DELETE' && dm) {
    if (!need()) return
    user.tracks = user.tracks.filter(t => t.id !== dm[1]); store.save()
    return send(res, 200, { ok: true })
  }

  return fail(res, 404, 'Endpoint tidak ditemukan.')
}

/* ------------------------------ static ------------------------------ */
function serveFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return fail(res, 404, 'Tidak ditemukan.')
    const ext = path.extname(file).toLowerCase()
    const type = MIME[ext] || 'application/octet-stream'
    const media = ext in { '.mp3': 1, '.m4a': 1, '.ogg': 1, '.wav': 1, '.flac': 1, '.aac': 1, '.opus': 1, '.mp4': 1, '.webm': 1 }
    const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': media ? 'public, max-age=86400' : 'no-cache' }
    const range = req.headers.range && req.headers.range.match(/bytes=(\d*)-(\d*)/)
    if (range) {
      let start = range[1] ? parseInt(range[1], 10) : 0
      let end = range[2] ? parseInt(range[2], 10) : st.size - 1
      if (!range[1] && range[2]) { start = Math.max(0, st.size - parseInt(range[2], 10)); end = st.size - 1 }
      if (start > end || start >= st.size) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end() }
      end = Math.min(end, st.size - 1)
      res.writeHead(206, Object.assign(headers, { 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 }))
      return fs.createReadStream(file, { start, end }).pipe(res)
    }
    res.writeHead(200, Object.assign(headers, { 'Content-Length': st.size }))
    if (req.method === 'HEAD') return res.end()
    fs.createReadStream(file).pipe(res)
  })
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname)
  if (rel.includes('\0')) return fail(res, 400, 'Path tidak valid.')
  let file = path.normalize(path.join(PUBLIC, rel))
  if (!file.startsWith(PUBLIC)) return fail(res, 403, 'Dilarang.')
  if (rel.endsWith('/')) file = path.join(file, 'index.html')
  if (!path.extname(file)) file = path.join(PUBLIC, 'index.html')   // fallback SPA
  serveFile(req, res, file)
}

/* ------------------------------ server ------------------------------ */
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  try {
    const url = new URL(req.url, 'http://x')
    if (url.pathname.startsWith('/api/')) return await api(req, res, url)
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Method tidak diizinkan.')
    serveStatic(req, res, url)
  } catch (e) {
    if (!res.headersSent) fail(res, 400, e.message || 'Permintaan tidak valid.')
    else res.end()
  }
})

server.listen(cfg.PORT, cfg.HOST, () => {
  console.log(`\n  Zeptrine Cloud berjalan di http://localhost:${cfg.PORT}`)
  console.log(`  Engine bot : ${engines.list().map(e => `${e.name} [${e.status === 'ready' ? 'siap' : e.status === 'installing' ? 'menginstal' : 'perlu npm install'}]`).join(', ') || 'belum ada (upload dari halaman Admin)'}`)
  console.log(`  Kode Owner : ${ADMIN_KEY}   (dipakai saat mendaftar sebagai ${cfg.ADMINS.join(' / ')})`)
  console.log(`  Slot bot   : ${cfg.MAX_TOTAL_BOTS}\n`)
  bots.restoreAll()
})
setInterval(() => auth.cleanup(), 3600000).unref()

function bye() { console.log('\nMenutup server...'); store.flush(); bots.shutdown(); setTimeout(() => process.exit(0), 300) }
process.on('SIGINT', bye)
process.on('SIGTERM', bye)
