// Menjalankan script bot (engine) sebagai proses terpisah untuk tiap user.
// Script bot TIDAK diubah: kita menjalankannya dengan nama sesi sendiri
//   node <entry> jb_<idUser>
// lalu mengisi prompt nomor lewat stdin dan membaca kode pairing dari stdout.
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g

class BotManager {
  constructor(cfg, store, engines) {
    this.cfg = cfg
    this.store = store
    this.engines = engines
    this.bots = new Map()
    this.migration = null           // status pemindahan user antar engine
    setInterval(() => this.tick(), 2000).unref()
  }

  /* ---------- helper ---------- */
  session(uid) { return 'jb_' + uid }
  user(uid) { return this.store.data.users[uid] }
  // arg : sesi di <engine>/jb_<id>        cwd : tiap user punya folder kerja sendiri <engine>/_jb/jb_<id>/ (sesi di dalam ./session)
  isolated(eng) { return this.engines.modeOf(eng) !== 'arg' }
  homeIn(uid, eng) { return this.isolated(eng) ? path.join(this.engines.dirOf(eng), '_jb', this.session(uid)) : this.engines.dirOf(eng) }
  sessionDirIn(uid, eng) {
    if (!this.isolated(eng)) return path.join(this.engines.dirOf(eng), this.session(uid))
    const rel = this.engines.modeOf(eng) === 'cwd-config' ? (this.engines.settings(eng).sessionRel || 'session') : 'session'
    return path.join(this.homeIn(uid, eng), rel)
  }
  // Folder JSON kecil (database/, dst) disalin per user; folder besar (plugins, node_modules, ...) di-symlink.
  isStateDir(dir) {
    let n = 0, size = 0
    const walk = d => {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        if (++n > 500) throw new Error('besar')
        const full = path.join(d, f.name)
        if (f.isDirectory()) walk(full)
        else if (!/\.json$/i.test(f.name)) throw new Error('bukan state')
        else if ((size += fs.statSync(full).size) > 5 * 1024 * 1024) throw new Error('besar')
      }
    }
    try { walk(dir); return true } catch (e) { return false }
  }
  prepareHome(uid, eng) {
    const src = this.engines.dirOf(eng), home = this.homeIn(uid, eng)
    const cfgName = this.engines.modeOf(eng) === 'cwd-config' ? this.engines.settings(eng).configFile : null
    fs.mkdirSync(home, { recursive: true })
    const skip = new Set(['_jb', 'session', 'sessions', 'database.json', '.git'])
    for (const name of fs.readdirSync(src)) {
      if (skip.has(name) || /_database\.json$/.test(name) || /\.zip$/i.test(name) || /^jb_/.test(name) || /^_/.test(name)) continue
      const from = path.join(src, name), to = path.join(home, name)
      try { fs.lstatSync(to); continue } catch (e) { /* belum ada */ }
      let st; try { st = fs.statSync(from) } catch (e) { continue }
      try {
        // config.js (nomor per user) disalin nyata, bukan symlink, supaya bisa ditulis beda tiap user.
        if (name === cfgName) fs.copyFileSync(from, to)
        else if (st.isDirectory() && this.isStateDir(from)) fs.cpSync(from, to, { recursive: true })
        else fs.symlinkSync(from, to, st.isDirectory() ? 'junction' : 'file')
      } catch (e) { /* lewati */ }
    }
  }
  // Tulis nomor WhatsApp user ke config.js miliknya sendiri (mode cwd-config).
  // --preserve-symlinks(-main) dipasang di nodeArgs supaya `import "./config.js"` dari file yang di-symlink
  // tetap membaca config.js DI FOLDER USER, bukan config.js asli yang dipakai bersama.
  patchConfigNumber(uid, eng, number) {
    const st = this.engines.settings(eng)
    const file = path.join(this.homeIn(uid, eng), st.configFile || 'config.js')
    let text = fs.readFileSync(file, 'utf8')
    const before = text
    text = text.replace(/(\bbotNumber\s*:\s*)(["'`])[^"'`]*\2/, `$1$2${number}$2`)
    text = text.replace(/(\busePairingCode\s*:\s*)(true|false)/, '$1true')
    if (text === before && !/\bbotNumber\s*:/.test(before)) throw new Error('Field botNumber tidak ditemukan di ' + (st.configFile || 'config.js'))
    fs.writeFileSync(file, text)
  }
  linkedAt(uid, eng) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(this.sessionDirIn(uid, eng), 'creds.json'), 'utf8'))
      // Baileys menulis `me` segera setelah kode pairing dibuat (belum tertaut).
      // Tertaut sungguhan = registered true (dipakai script bot sendiri) atau ada `account` dari pair-success.
      if (!(j && (j.registered === true || j.account))) return null
      const id = j.me && j.me.id
      return id ? String(id).split(':')[0].split('@')[0] : null
    } catch (e) { return null }
  }
  linkedEngine(uid) {
    const u = this.user(uid)
    for (const e of [u && u.engine, 'default']) if (e && this.engines.has(e) && this.linkedAt(uid, e)) return e
    return null
  }
  linked(uid) { const e = this.linkedEngine(uid); return e ? this.linkedAt(uid, e) : null }
  curEngine(uid) {
    const b = this.bots.get(uid); const u = this.user(uid)
    return (b && b.engine) || this.linkedEngine(uid) || (u && u.engine) || null
  }
  available() { return this.engines.hasReady() }
  running(b) { return !!(b && b.proc) }
  usersOf(eng) { return Object.keys(this.store.data.users).filter(uid => this.linkedEngine(uid) === eng).length }
  runningOf(eng) { return [...this.bots.values()].filter(b => this.running(b) && b.engine === eng).length }

  /* ---------- statistik ---------- */
  activeCount() { return [...this.bots.values()].filter(b => this.running(b)).length }
  onlineCount() { return [...this.bots.values()].filter(b => b.state === 'online').length }
  slotsLeft() { return Math.max(0, this.cfg.MAX_TOTAL_BOTS - this.activeCount()) }

  /* ---------- status untuk API ---------- */
  status(uid) {
    const b = this.bots.get(uid)
    const linked = this.linked(uid)
    const eng = this.curEngine(uid)
    return {
      available: this.available(),
      state: b ? b.state : (linked ? 'stopped' : 'idle'),
      number: (b && b.number) || linked || null,
      linked: !!linked,
      engine: eng && this.engines.has(eng) ? { id: eng, name: this.engines.nameOf(eng) } : null,
      engines: this.engines.readyList(),
      activeEngine: this.engines.activeId(),
      code: b && b.state === 'code' ? b.code : null,
      codeLeft: b && b.state === 'code' ? Math.max(0, Math.round((b.deadline - Date.now()) / 1000)) : 0,
      error: (b && b.error) || null,
      startedAt: (b && b.startedAt) || null,
      slotsLeft: this.slotsLeft(),
      logs: b ? b.logs.slice(-40) : []
    }
  }

  normalize(input) {
    let d = String(input || '').replace(/\D/g, '')
    if (d.startsWith('0')) d = this.cfg.DEFAULT_COUNTRY + d.slice(1)
    return d
  }

  /* ---------- kontrol ---------- */
  connect(uid, rawNumber, engineId) {
    if (!this.available()) return { error: 'Belum ada script bot yang siap. Hubungi admin.' }
    const cur = this.bots.get(uid)
    if (this.running(cur)) return { ok: true }
    const linkedEng = this.linkedEngine(uid)
    const linked = linkedEng ? this.linkedAt(uid, linkedEng) : null
    let number = this.normalize(rawNumber), eng
    if (linked) {
      if (number && number !== linked) return { error: `Akunmu sudah tertaut ke ${linked}. Putuskan dulu untuk ganti nomor.` }
      number = linked; eng = linkedEng
    } else {
      if (number.length < 10 || number.length > 15) return { error: 'Nomor tidak valid. Contoh: 6281234567890' }
      eng = engineId && this.engines.isReady(engineId) ? engineId : this.engines.activeId()
      const cc = eng && this.engines.countryOf(eng)
      if (cc && !number.startsWith(cc)) return { error: `Script bot ini hanya menerima nomor berawalan ${cc}.` }
    }
    if (!eng || !this.engines.isReady(eng)) return { error: 'Engine bot belum siap.' }
    for (const [otherUid, b] of this.bots) {
      if (otherUid !== uid && (b.number === number || this.linked(otherUid) === number)) return { error: 'Nomor ini sudah dipakai akun lain.' }
    }
    if (this.slotsLeft() <= 0) return { error: 'Slot bot penuh. Coba lagi nanti.' }
    const u = this.user(uid); if (u) { u.engine = eng; this.store.save() }
    if (!linked) { try { fs.rmSync(this.sessionDirIn(uid, eng), { recursive: true, force: true }) } catch (e) { /* abaikan */ } }
    this.spawnBot(uid, number, eng)
    return { ok: true }
  }

  regexes(eng) {
    const s = this.engines.settings(eng)
    const mk = (src, fb) => { try { return new RegExp(src || fb, 'i') } catch (e) { return new RegExp(fb, 'i') } }
    return {
      prompt: mk(s.prompt || this.cfg.BOT_PROMPT, 'Masukkan nomor bot'),
      code: mk(s.codeRegex || this.cfg.BOT_CODE_REGEX, 'Pairing Code\\s*:\\s*([A-Z0-9]{4})-?([A-Z0-9]{4})')
    }
  }

  spawnBot(uid, number, eng) {
    const prev = this.bots.get(uid)
    const b = {
      uid, number, engine: eng, state: 'starting', code: null, error: null, proc: null, stopping: false,
      startedAt: Date.now(), deadline: Date.now() + this.cfg.PAIRING_TIMEOUT_SEC * 1000,
      logs: prev ? prev.logs.slice(-20) : [], restarts: prev ? prev.restarts : [], sentNumber: false, buf: ''
    }
    this.bots.set(uid, b)
    const re = this.regexes(eng)
    const dir = this.engines.dirOf(eng)
    const cwdMode = this.isolated(eng)
    if (cwdMode) {
      try { this.prepareHome(uid, eng) } catch (e) { b.state = 'error'; b.error = 'Gagal menyiapkan folder bot: ' + e.message; return }
      if (this.engines.modeOf(eng) === 'cwd-config') {
        try { this.patchConfigNumber(uid, eng, number) } catch (e) { b.state = 'error'; b.error = 'Gagal menulis nomor ke config bot: ' + e.message; return }
      }
    }
    // Entry & config di-run dari lokasi SYMLINK (di folder user) bukan folder asli, supaya import relatif
    // ("./config.js") mengikuti config.js milik user. --preserve-symlinks(-main) yang membuat ini bekerja.
    const entryPath = cwdMode ? path.join(this.homeIn(uid, eng), this.engines.entryOf(eng)) : path.join(dir, this.engines.entryOf(eng))
    const args = [...(this.engines.settings(eng).nodeArgs || []), entryPath, this.session(uid), ...this.cfg.BOT_ARGS]
    let proc
    try {
      proc = spawn(process.execPath, args, { cwd: cwdMode ? this.homeIn(uid, eng) : dir, stdio: ['pipe', 'pipe', 'pipe'], env: process.env })
    } catch (e) { b.state = 'error'; b.error = 'Gagal menjalankan bot: ' + e.message; return }
    b.proc = proc
    this.log(b, `[web] engine "${this.engines.nameOf(eng)}", sesi ${this.session(uid)}`)
    const onData = chunk => {
      const text = chunk.toString().replace(ANSI, '')
      text.split(/\r?\n/).forEach(l => l.trim() && this.log(b, l.trim().slice(0, 300)))
      b.buf = (b.buf + text).slice(-4000)
      if (!b.sentNumber && re.prompt.test(b.buf)) {
        b.sentNumber = true
        try { proc.stdin.write(number + '\n') } catch (e) { /* proses sudah mati */ }
      }
      const m = b.buf.match(re.code)
      if (m && b.state === 'starting') {
        b.code = m.slice(1).join('').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        b.state = 'code'
        b.deadline = Date.now() + this.cfg.PAIRING_TIMEOUT_SEC * 1000
      }
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)
    proc.stdin.on('error', () => {})
    proc.on('error', e => { b.state = 'error'; b.error = 'Proses bot error: ' + e.message; b.proc = null })
    proc.on('exit', code => {
      b.proc = null
      this.log(b, `[web] proses bot berhenti (kode ${code})`)
      if (b.stopping) { if (b.state !== 'expired' && b.state !== 'error') b.state = 'stopped'; return }
      if (b.state === 'online') return this.autoRestart(b)
      if (b.state === 'expired') return
      b.state = 'error'
      b.error = 'Bot berhenti sebelum tertaut. Cek log di bawah.'
    })
  }

  autoRestart(b) {
    const now = Date.now()
    b.restarts = b.restarts.filter(t => now - t < 10 * 60000)
    if (b.restarts.length >= 5) { b.state = 'error'; b.error = 'Bot terus berhenti sendiri. Coba Mulai ulang atau cek log.'; return }
    b.restarts.push(now)
    b.state = 'starting'
    setTimeout(() => { if (this.bots.get(b.uid) === b && !b.proc && !b.stopping) this.spawnBot(b.uid, b.number, b.engine) }, 3000)
  }

  log(b, line) { b.logs.push(line); if (b.logs.length > 80) b.logs.splice(0, b.logs.length - 80) }

  kill(b) {
    if (!b || !b.proc) return
    b.stopping = true
    const p = b.proc
    try { p.kill('SIGTERM') } catch (e) { /* abaikan */ }
    setTimeout(() => { try { p.kill('SIGKILL') } catch (e) { /* abaikan */ } }, 5000).unref()
  }

  stop(uid) {
    const b = this.bots.get(uid)
    if (b) { this.kill(b); b.state = 'stopped'; b.error = null; b.code = null }
    return { ok: true }
  }

  // Putus total: hentikan proses, hapus sesi & database bot milik user.
  logout(uid) {
    const b = this.bots.get(uid)
    const eng = this.curEngine(uid)
    this.kill(b)
    this.bots.delete(uid)
    const u = this.user(uid); if (u) { delete u.engine; this.store.save() }
    if (!eng || !this.engines.has(eng)) return { ok: true }
    const rm = p => { try { fs.rmSync(p, { recursive: true, force: true }) } catch (e) { /* abaikan */ } }
    const cwdMode = this.isolated(eng)
    setTimeout(() => {
      if (cwdMode) rm(this.homeIn(uid, eng))                       // folder kerja user (sesi + database)
      else { rm(this.sessionDirIn(uid, eng)); rm(path.join(this.engines.dirOf(eng), this.session(uid) + '_database.json')) }
    }, 1500)
    return { ok: true }
  }

  tick() {
    const now = Date.now()
    for (const b of this.bots.values()) {
      if (!b.proc) continue
      if (b.state === 'starting' || b.state === 'code') {
        const n = this.linkedAt(b.uid, b.engine)
        if (n) { b.state = 'online'; b.number = n; b.code = null; b.error = null; this.log(b, `[web] nomor ${n} tertaut`); continue }
      }
      if (now > b.deadline && (b.state === 'starting' || b.state === 'code')) {
        const wasCode = b.state === 'code'
        b.state = wasCode ? 'expired' : 'error'
        b.error = wasCode ? 'Kode kedaluwarsa. Minta kode baru.' : 'Bot tidak memberi kode. Cek log di bawah.'
        this.kill(b)
      }
    }
  }

  // Nyalakan lagi bot yang sudah tertaut saat server dihidupkan.
  restoreAll() {
    if (!this.cfg.AUTO_RESTORE) return
    let n = 0
    for (const u of Object.values(this.store.data.users)) {
      const eng = this.linkedEngine(u.id)
      if (eng && this.engines.isReady(eng) && this.slotsLeft() > 0) { this.spawnBot(u.id, this.linkedAt(u.id, eng), eng); n++ }
    }
    if (n) console.log(`[bots] ${n} bot dinyalakan kembali`)
  }

  /* ---------- ganti script: pindahkan semua user ---------- */
  // Sesi WhatsApp (folder jb_<id>) DIPINDAH ke engine baru, jadi user tidak perlu menautkan ulang.
  // Database bot (jb_<id>_database.json) sengaja ditinggal di engine lama agar tidak bentrok antar script;
  // kalau kamu balik ke script lama, datanya masih ada.
  switchAll(target) {
    if (!this.engines.isReady(target)) throw new Error('Engine tujuan belum siap.')
    if (this.migration && this.migration.running) throw new Error('Pemindahan sebelumnya masih berjalan.')
    const users = Object.keys(this.store.data.users).filter(uid => { const e = this.linkedEngine(uid); return e && e !== target })
    const m = this.migration = { target, targetName: this.engines.nameOf(target), total: users.length, done: 0, failed: [], running: users.length > 0, startedAt: Date.now() }
    if (!users.length) return m
    ;(async () => {
      for (const uid of users) {
        try { await this.moveUser(uid, target) } catch (e) { m.failed.push({ user: (this.user(uid) || {}).username || uid, error: e.message }) }
        m.done++
        await new Promise(r => setTimeout(r, 1500))     // beri jeda supaya RAM tidak melonjak
      }
      m.running = false; m.finishedAt = Date.now()
    })()
    return m
  }

  async moveUser(uid, target) {
    const from = this.linkedEngine(uid)
    if (!from || from === target) return
    const b = this.bots.get(uid)
    const wasRunning = this.running(b)
    if (b && b.proc) {
      this.kill(b)
      for (let i = 0; i < 40 && b.proc; i++) await new Promise(r => setTimeout(r, 250))
      if (b.proc) throw new Error('Bot lama tidak mau berhenti.')
    }
    const number = this.linkedAt(uid, from)
    const src = this.sessionDirIn(uid, from), dst = this.sessionDirIn(uid, target)
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.rmSync(dst, { recursive: true, force: true })        // sisa sesi lama di tujuan (kalau pernah pindah bolak-balik)
    try { fs.renameSync(src, dst) } catch (e) { fs.cpSync(src, dst, { recursive: true }); fs.rmSync(src, { recursive: true, force: true }) }
    const u = this.user(uid); if (u) { u.engine = target; this.store.save() }
    if (b) b.engine = target
    if (wasRunning && this.slotsLeft() > 0) this.spawnBot(uid, number, target)
  }

  shutdown() { for (const b of this.bots.values()) this.kill(b) }
}
module.exports = BotManager
