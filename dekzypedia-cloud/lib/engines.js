// Engine = satu paket script bot. Admin bisa upload zip dari website, install dependensi,
// ganti engine aktif, dan menghapusnya. Tiap engine tinggal di bot-engine/_<id>/.
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { spawn } = require('child_process')

const ENTRY_GUESS = ['azbry.js', 'index.js', 'main.js', 'bot.js', 'start.js', 'app.js']
const SKIP_ROOT = new Set(['session', 'sessions', '.git', '__MACOSX', 'database.json'])   // jangan bawa sesi login & data lama
const MAX_UNPACKED = 700 * 1024 * 1024

/* ---------- unzip minimal (tanpa dependency) ---------- */
function unzip(buf, dest) {
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('File bukan zip yang valid.')
  const count = buf.readUInt16LE(eocd + 10)
  let off = buf.readUInt32LE(eocd + 16)
  const all = []
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('Struktur zip rusak.')
    const nl = buf.readUInt16LE(off + 28), el = buf.readUInt16LE(off + 30), cl = buf.readUInt16LE(off + 32)
    all.push({
      method: buf.readUInt16LE(off + 10), csize: buf.readUInt32LE(off + 20), usize: buf.readUInt32LE(off + 24),
      lho: buf.readUInt32LE(off + 42), name: buf.toString('utf8', off + 46, off + 46 + nl).replace(/\\/g, '/')
    })
    off += 46 + nl + el + cl
  }
  let files = all.filter(e => !e.name.endsWith('/') && !path.basename(e.name).startsWith('._'))
  const roots = new Set(files.map(e => e.name.split('/')[0]))
  const rootFile = files.some(e => !e.name.includes('/'))
  const strip = roots.size === 1 && !rootFile ? [...roots][0] + '/' : ''
  files = files.map(e => Object.assign(e, { rel: e.name.slice(strip.length) }))
    .filter(e => e.rel && !SKIP_ROOT.has(e.rel.split('/')[0]))
    .filter(e => e.rel.includes('/') || !(/_database\.json$/.test(e.rel) || /\.zip$/i.test(e.rel)))   // buang database & zip bawaan di root
  if (!files.length) throw new Error('Zip kosong.')
  if (files.reduce((a, e) => a + e.usize, 0) > MAX_UNPACKED) throw new Error('Isi zip terlalu besar.')
  const base = path.resolve(dest)
  fs.mkdirSync(base, { recursive: true })
  for (const e of files) {
    const target = path.resolve(base, e.rel)
    if (!target.startsWith(base + path.sep)) continue               // cegah zip-slip
    const nl = buf.readUInt16LE(e.lho + 26), el = buf.readUInt16LE(e.lho + 28)
    const start = e.lho + 30 + nl + el
    const raw = buf.subarray(start, start + e.csize)
    let data
    if (e.method === 0) data = raw
    else if (e.method === 8) data = zlib.inflateRawSync(raw)
    else throw new Error('Metode kompresi zip tidak didukung.')
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, data)
  }
  return files.length
}

// Kenali jenis script dari isinya.
//  arg : nama sesi bisa dikirim lewat argumen (mis. azbry.js)
//  cwd : sesi fix di ./session, jadi tiap user dijalankan di folder kerja sendiri (mis. start.js)
function scanFor(dir, regex, opts) {
  const skip = new Set(['node_modules', '.git', 'database', 'storage', 'session', 'sessions', 'test', '_jb'])
  const maxFiles = (opts && opts.maxFiles) || 4000
  let seen = 0
  const stack = [dir]
  while (stack.length) {
    const d = stack.pop()
    let ents
    try { ents = fs.readdirSync(d, { withFileTypes: true }) } catch (e) { continue }
    for (const e of ents) {
      if (skip.has(e.name)) continue
      const full = path.join(d, e.name)
      if (e.isDirectory()) { stack.push(full); continue }
      if (!/\.[cm]?js$/.test(e.name)) continue
      if (++seen > maxFiles) return null
      let text
      try { text = fs.readFileSync(full, 'utf8') } catch (err) { continue }
      const m = text.match(regex)
      if (m) return m
    }
  }
  return null
}

function detect(dir) {
  const has = f => fs.existsSync(path.join(dir, f))
  const read = f => { try { return fs.readFileSync(path.join(dir, f), 'utf8') } catch (e) { return '' } }
  if (has('azbry.js')) return { entry: 'azbry.js', mode: 'arg', prompt: '', country: '' }
  // Config-number style (mis. Zeptrine): nomor bot ditulis ke config.js, sesi di path tetap.
  // Dikenali lewat: entry dari package.json ("main", biasanya index.js) yang meng-import config.js,
  // config.js punya field botNumber, dan session dipanggil lewat useMultiFileAuthState("path/tetap").
  let pkg = {}
  try { pkg = JSON.parse(read('package.json')) } catch (e) { /* bukan proyek npm */ }
  const mainFile = pkg.main || 'index.js'
  if (has(mainFile)) {
    const configFile = ['config.js', 'appConfig.js'].find(f => has(f))
    const cfgText = configFile ? read(configFile) : ''
    if (configFile && /\bbotNumber\s*:/.test(cfgText)) {
      const m = scanFor(dir, /useMultiFileAuthState\(\s*["'`]([^"'`]+)["'`]/)
      if (m) {
        return {
          entry: mainFile, mode: 'cwd-config', configFile, sessionRel: m[1].replace(/^\.\/?/, ''),
          prompt: '', country: '',
          codeRegex: 'PAIRING CODE[\\s\\S]{0,200}?([A-Za-z0-9]{2,8}(?:-[A-Za-z0-9]{2,8})+)',
          nodeArgs: ['--preserve-symlinks', '--preserve-symlinks-main']
        }
      }
    }
  }
  if (has('start.js')) {
    const t = read('start.js')
    if (/useMultiFileAuthState\(\s*sessionDir\s*\)|sessionDir\s*=\s*["']session["']/.test(t)) {
      return { entry: 'start.js', mode: 'cwd', prompt: /Masukkan nomor WhatsApp/i.test(t) ? 'Masukkan nomor WhatsApp' : '', country: /diawali 62/.test(t) ? '62' : '' }
    }
  }
  return null
}

class Engines {
  constructor(cfg, dataDir) {
    this.cfg = cfg
    this.root = cfg.BOT_DIR
    fs.mkdirSync(this.root, { recursive: true })
    this.file = path.join(dataDir, 'engines.json')
    this.meta = { active: null, engines: {} }
    try { this.meta = Object.assign(this.meta, JSON.parse(fs.readFileSync(this.file, 'utf8'))) } catch (e) { /* baru */ }
    this.state = new Map()          // id -> { status, log[] } (proses install)
  }
  save() { fs.writeFileSync(this.file, JSON.stringify(this.meta, null, 1)) }

  /* ---------- daftar ---------- */
  // Script yang ditaruh langsung di bot-engine/ (tanpa upload) dianggap engine "default".
  legacyInfo() {
    if (this._li && Date.now() - this._li.at < 4000) return this._li.v
    let v = detect(this.root)
    if (!v && fs.existsSync(path.join(this.root, this.cfg.BOT_ENTRY))) v = { entry: this.cfg.BOT_ENTRY, mode: 'arg', prompt: '', country: '' }
    this._li = { at: Date.now(), v }
    return v
  }
  legacy() { return !!this.legacyInfo() }
  ids() { return [...(this.legacy() ? ['default'] : []), ...Object.keys(this.meta.engines)] }
  has(id) { return this.ids().includes(id) }
  dirOf(id) { return id === 'default' ? this.root : path.join(this.root, '_' + id) }
  modeOf(id) { return id === 'default' ? ((this.legacyInfo() || {}).mode || 'arg') : (this.meta.engines[id] || {}).mode || 'arg' }
  countryOf(id) { return id === 'default' ? ((this.legacyInfo() || {}).country || '') : (this.meta.engines[id] || {}).country || '' }
  entryOf(id) { return id === 'default' ? (this.legacyInfo() || {}).entry || this.cfg.BOT_ENTRY : (this.meta.engines[id] || {}).entry }
  nameOf(id) { return id === 'default' ? 'Script di folder bot-engine' : (this.meta.engines[id] || {}).name || id }
  settings(id) { return id === 'default' ? (this.legacyInfo() || {}) : this.meta.engines[id] || {} }
  isReady(id) {
    if (!this.has(id)) return false
    const st = this.state.get(id)
    if (st && st.status === 'installing') return false
    const dir = this.dirOf(id)
    if (!fs.existsSync(path.join(dir, this.entryOf(id) || '-'))) return false
    if (!fs.existsSync(path.join(dir, 'node_modules')) && this.needsModules(dir)) return false
    return true
  }
  needsModules(dir) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      return Object.keys(pkg.dependencies || {}).length > 0
    } catch (e) { return false }
  }
  hasReady() { return this.ids().some(id => this.isReady(id)) }
  readyList() { return this.ids().filter(id => this.isReady(id)).map(id => ({ id, name: this.nameOf(id) })) }
  activeId() {
    if (this.meta.active && this.isReady(this.meta.active)) return this.meta.active
    return this.ids().find(id => this.isReady(id)) || null
  }
  status(id) {
    const st = this.state.get(id)
    if (st && st.status === 'installing') return 'installing'
    if (this.isReady(id)) return 'ready'
    if (st && st.status === 'failed') return 'failed'
    return 'needs-install'
  }
  list() {
    const act = this.activeId()
    return this.ids().map(id => ({
      id, name: this.nameOf(id), entry: this.entryOf(id), status: this.status(id), active: id === act,
      legacy: id === 'default', mode: this.modeOf(id), createdAt: (this.meta.engines[id] || {}).createdAt || null,
      log: ((this.state.get(id) || {}).log || []).slice(-25)
    }))
  }

  /* ---------- aksi ---------- */
  slug(name) { return String(name || 'bot').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'bot' }
  addZip(buf, opt) {
    const id = this.slug(opt.name)
    if (id === 'default') throw new Error('Nama "default" dicadangkan.')
    const dir = this.dirOf(id)
    unzip(buf, dir)                                 // menimpa file; sesi user (jb_*) & node_modules tetap aman
    const det = detect(dir) || {}
    const entry = [opt.entry, det.entry, this.cfg.BOT_ENTRY, ...ENTRY_GUESS].filter(Boolean).find(f => fs.existsSync(path.join(dir, f)))
    if (!entry) { if (!this.meta.engines[id]) fs.rmSync(dir, { recursive: true, force: true }); throw new Error('File utama bot tidak ditemukan (azbry.js / start.js / index.js). Isi kolom "File utama".') }
    const prev = this.meta.engines[id] || {}
    const mode = opt.mode && opt.mode !== 'auto' ? opt.mode : (det.mode || prev.mode || 'arg')
    this.meta.engines[id] = {
      name: String(opt.name || id).slice(0, 40), entry, mode,
      prompt: opt.prompt || det.prompt || prev.prompt || '', codeRegex: opt.codeRegex || det.codeRegex || prev.codeRegex || '',
      country: det.country != null && det.entry === entry ? det.country : (prev.country || ''),
      configFile: det.configFile || prev.configFile || '', sessionRel: det.sessionRel || prev.sessionRel || 'session',
      nodeArgs: det.nodeArgs || prev.nodeArgs || [], createdAt: prev.createdAt || Date.now()
    }
    if (!this.meta.active) this.meta.active = id
    this.save()
    this.install(id)
    return id
  }
  install(id) {
    if (!this.has(id)) return
    const dir = this.dirOf(id), st = { status: 'installing', log: [] }
    this.state.set(id, st)
    if (!fs.existsSync(path.join(dir, 'package.json'))) { st.status = 'ready'; st.log.push('Tidak ada package.json, tidak perlu install.'); return }
    st.log.push('npm install dimulai (bisa beberapa menit)...')
    let p
    try { p = spawn('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir, shell: true }) } catch (e) { st.status = 'failed'; st.log.push(e.message); return }
    const on = c => c.toString().split(/\r?\n/).forEach(l => { if (l.trim()) { st.log.push(l.trim().slice(0, 200)); if (st.log.length > 80) st.log.shift() } })
    p.stdout.on('data', on); p.stderr.on('data', on)
    p.on('error', e => { st.status = 'failed'; st.log.push('npm error: ' + e.message) })
    p.on('close', code => {
      st.status = code === 0 ? 'ready' : 'failed'
      st.log.push(code === 0 ? 'Selesai. Engine siap dipakai.' : `npm install gagal (kode ${code}).`)
    })
  }
  setActive(id) {
    if (!this.isReady(id)) throw new Error('Engine belum siap.')
    this.meta.active = id; this.save()
  }
  remove(id) {
    if (id === 'default') throw new Error('Bot bawaan tidak bisa dihapus dari website.')
    if (!this.meta.engines[id]) throw new Error('Engine tidak ditemukan.')
    fs.rmSync(this.dirOf(id), { recursive: true, force: true })
    delete this.meta.engines[id]
    if (this.meta.active === id) this.meta.active = null
    this.state.delete(id); this.save()
  }
}
module.exports = Engines
module.exports.detect = detect
