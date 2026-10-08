/* Zeptrine Cloud - frontend (SPA tanpa framework). Semua teks/warna dari /api/config (config.js). */
(function () {
'use strict'
const $ = (s, r = document) => r.querySelector(s)
const S = { cfg: null, user: null, cleanup: null }

/* ---------------- util ---------------- */
function h(tag, props, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'html') el.innerHTML = v
    else if (k === 'style') el.style.cssText = v
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (v === true) el.setAttribute(k, '')
    else el.setAttribute(k, v)
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(k))
  return el
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const fmt = n => Number(n || 0).toLocaleString('id-ID')
const hue = s => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) % 360; return x }
const grad = s => { const l = 24 + hue(s) % 22; return `linear-gradient(135deg,hsl(0 0% ${l + 14}%),hsl(0 0% ${l - 8}%))` }
const clock = ts => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
const dur = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }
const up = s => { s = Number(s) || 0; const d = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}h ${hh}j` : hh ? `${hh}j ${m}m` : `${m}m` }
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) } catch (e) { return d } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { /* abaikan */ } } }

async function api(path, opt = {}) {
  const o = { method: opt.method || 'GET', headers: {}, credentials: 'same-origin' }
  if (opt.body) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opt.body) }
  let r, j
  try { r = await fetch(path, o); j = await r.json() } catch (e) { throw new Error('Tidak bisa terhubung ke server.') }
  if (!r.ok || j.ok === false) { const err = new Error(j.error || 'Terjadi kesalahan.'); err.status = r.status; throw err }
  return j
}
function toast(msg, type) {
  const t = h('div', { class: 'toast ' + (type || '') }, msg)
  $('#toasts').append(t); setTimeout(() => t.remove(), 3800)
}
async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); toast(label || 'Tersalin', 'ok') } catch (e) { toast('Gagal menyalin, salin manual.', 'err') }
}
const ICON = {
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  eye: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  next: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5v14l9-7zM17 5h2v14h-2z"/></svg>',
  prev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 5v14l-9-7zM5 5h2v14H5z"/></svg>',
  shuffle: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  repeat: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
  heart: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  note: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  chat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  vol: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  wa: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/></svg>',
  ig: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>',
  gh: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>'
}
const svg = (name) => h('span', { html: ICON[name], style: 'display:inline-flex' })
const avatar = name => h('span', { class: 'avatar', style: `background:${grad(name)}` }, String(name)[0].toUpperCase())

/* ---------------- tema & config ---------------- */
function applyTheme() {
  const t = S.cfg.theme || {}
  const r = document.documentElement.style
  if (t.brand) { r.setProperty('--brand', t.brand); r.setProperty('--brand-text', t.brand); r.setProperty('--btn', t.brand); r.setProperty('--on-btn', '#fff'); r.setProperty('--btn-hover', `color-mix(in srgb, ${t.brand} 82%, #000)`) }
  if (t.brand2) r.setProperty('--brand-2', t.brand2)
  if (!localStorage.getItem('lc_theme') && t.defaultMode) document.documentElement.setAttribute('data-theme', t.defaultMode)
  document.title = `${S.cfg.name} - Hosting Bot WhatsApp Tanpa VPS`
  $('#splashName').textContent = S.cfg.name.toUpperCase()
}
function setTheme(mode) { document.documentElement.setAttribute('data-theme', mode); try { localStorage.setItem('lc_theme', mode) } catch (e) { /* abaikan */ } renderNav() }

/* ---------------- router ---------------- */
const routes = {}
const protectedRoutes = new Set(['/panel', '/chat', '/admin'])
function path() { return (location.hash.replace(/^#/, '') || '/').split('?')[0] }
function go(p) { location.hash = '#' + p }
async function render() {
  if (S.cleanup) { try { S.cleanup() } catch (e) { /* abaikan */ } S.cleanup = null }
  let p = path()
  if (protectedRoutes.has(p) && !S.user) { store.set('lc_next', p); return go('/login') }
  if (p === '/admin' && S.user && !S.user.admin) { toast('Halaman ini khusus Owner.', 'err'); return go('/panel') }
  if ((p === '/login' || p === '/register') && S.user) return go('/panel')
  const view = routes[p] || routes['/404']
  const root = $('#view'); root.replaceChildren()
  const r = await view()
  if (r && r.el) root.append(r.el)
  S.cleanup = r && r.destroy
  renderNav(); renderFoot()
  if (r && r.scroll) setTimeout(() => { const t = document.getElementById(r.scroll); t ? t.scrollIntoView() : 0 }, 30)
  else window.scrollTo(0, 0)
}
window.addEventListener('hashchange', render)

/* ---------------- nav & footer ---------------- */
let menuOpen = false, mobOpen = false
function renderNav() {
  const cur = path(), c = S.cfg, dark = document.documentElement.getAttribute('data-theme') === 'dark'
  const links = [['/fitur', 'Fitur'], ['/panduan', 'Panduan'], ['/docs', 'Docs'], ['/chat', 'Chat'], ['/music', 'Musik']]
  if (S.user) links.push(['/panel', 'Panel'])
  if (S.user && S.user.admin) links.push(['/admin', 'Owner'])
  const nav = $('#nav'); nav.replaceChildren()
  const wrap = h('div', { class: 'wrap' },
    h('a', { class: 'logo', href: '#/' }, h('img', { src: '/icon.svg', alt: '' }), c.name.toUpperCase()),
    h('nav', { class: 'nav-links', 'aria-label': 'Navigasi utama' }, links.map(([p, t]) => h('a', { href: '#' + p, class: cur === p ? 'on' : '' }, t))),
    h('div', { class: 'nav-end' },
      h('button', { class: 'icon-btn theme-btn', 'aria-label': 'Ganti tema', onclick: () => setTheme(dark ? 'light' : 'dark'),
        html: dark ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>' }),
      S.user
        ? h('button', { class: 'usr', 'aria-haspopup': 'true', onclick: e => { e.stopPropagation(); menuOpen = !menuOpen; renderNav() } }, avatar(S.user.username), h('span', {}, S.user.username))
        : [h('a', { class: 'btn btn-ghost btn-sm', href: '#/login', style: 'display:' + (innerWidth < 560 ? 'none' : 'inline-flex') }, 'Login'),
           h('a', { class: 'btn btn-primary btn-sm nav-cta', href: '#/register' }, 'Mulai Gratis')],
      h('button', { class: 'icon-btn burger', 'aria-label': 'Menu', onclick: () => { mobOpen = !mobOpen; renderNav() },
        html: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' })))
  nav.append(wrap)
  if (S.user && menuOpen) nav.append(h('div', { class: 'menu', onclick: e => e.stopPropagation() },
    h('a', { href: '#/panel', onclick: () => { menuOpen = false } }, 'Panel bot'),
    h('a', { href: '#/chat', onclick: () => { menuOpen = false } }, 'Chat'),
    h('hr'), h('button', { onclick: logout }, 'Keluar')))
  nav.append(h('div', { class: 'mnav' + (mobOpen ? ' open' : '') },
    [['/', 'Beranda'], ...links].map(([p, t]) => h('a', { href: '#' + p, onclick: () => { mobOpen = false; renderNav() } }, t)),
    h('a', { href: '#', onclick: e => { e.preventDefault(); setTheme(dark ? 'light' : 'dark') } }, dark ? 'Tema putih' : 'Tema hitam'),
    S.user ? h('a', { href: '#', onclick: e => { e.preventDefault(); mobOpen = false; logout() } }, 'Keluar') : h('a', { href: '#/login', onclick: () => { mobOpen = false } }, 'Login'), h('a', { href: '#/register', onclick: () => { mobOpen = false } }, 'Daftar gratis')))
}
document.addEventListener('click', () => { if (menuOpen) { menuOpen = false; renderNav() } })
async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }) } catch (e) { /* abaikan */ }
  S.user = null; menuOpen = false; Player.reset(true); go('/'); renderNav(); toast('Kamu sudah keluar.')
}
function renderFoot() {
  const c = S.cfg, L = c.links || {}
  const li = (href, t) => h('li', {}, h('a', { href }, t))
  const soc = []
  if (L.whatsapp) soc.push(h('a', { href: 'https://wa.me/' + L.whatsapp, target: '_blank', rel: 'noopener', 'aria-label': 'WhatsApp', html: ICON.wa }))
  if (L.instagram) soc.push(h('a', { href: L.instagram, target: '_blank', rel: 'noopener', 'aria-label': 'Instagram', html: ICON.ig }))
  if (L.github) soc.push(h('a', { href: L.github, target: '_blank', rel: 'noopener', 'aria-label': 'GitHub', html: ICON.gh }))
  const f = $('#foot'); f.replaceChildren(h('div', { class: 'wrap' },
    h('div', { class: 'foot' },
      h('div', {}, h('a', { class: 'logo', href: '#/' }, h('img', { src: '/icon.svg', alt: '' }), c.name.toUpperCase()), h('p', {}, c.description), h('div', { class: 'socials' }, soc)),
      h('div', {}, h('h4', {}, 'Produk'), h('ul', {}, li('#/', 'Beranda'), li('#/fitur', 'Fitur'), li('#/panel', 'Panel bot'), li('#/register', 'Daftar gratis'))),
      h('div', {}, h('h4', {}, 'Komunitas'), h('ul', {}, li('#/chat', 'Chat semua user'), li('#/music', 'Pemutar musik'), L.channel ? h('li', {}, h('a', { href: L.channel, target: '_blank', rel: 'noopener' }, 'Saluran WhatsApp')) : null)),
      h('div', {}, h('h4', {}, 'Bantuan'), h('ul', {}, li('#/panduan', 'Panduan'), li('#/docs', 'Docs API'), L.whatsapp ? h('li', {}, h('a', { href: 'https://wa.me/' + L.whatsapp, target: '_blank', rel: 'noopener' }, 'Hubungi admin')) : null))),
    h('div', { class: 'copy' }, h('span', {}, `© ${c.year} ${c.name}. Dibuat oleh ${c.developer}.`), h('span', {}, `Ditenagai ${c.botName}`))))
}

/* ---------------- statistik (dipakai beranda & docs) ---------------- */
function sparkSvg(vals) {
  const W = 600, H = 150, max = Math.max(4, ...vals), step = W / (vals.length - 1)
  const pts = vals.map((v, i) => [i * step, H - 14 - (v / max) * (H - 34)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Grafik pesan chat per menit">
    <defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--brand)" stop-opacity=".45"/><stop offset="1" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
    <path d="${line} L${W} ${H} L0 ${H}Z" fill="url(#sg)"/><path d="${line}" fill="none" stroke="var(--brand-2)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`
}

/* ---------------- BERANDA ---------------- */
async function Home() {
  const c = S.cfg, L = c.links || {}
  const el = h('div')
  const cta = S.user ? '#/panel' : '#/register'
  const heroBg = h('div', { class: 'hero-bg' }, c.heroVideo ? h('video', { src: c.heroVideo, autoplay: true, muted: true, loop: true, playsinline: true }) : [h('span', { class: 'orb a' }), h('span', { class: 'orb b' })])
  const pill = h('span', { class: 'status-pill' }, h('span', { class: 'dot wait' }), h('span', { id: 'hp' }, 'Menghubungkan ke server'))
  const perks = [`Gratis selamanya, tanpa paket`, `${c.slots} slot hosting, ${c.totalModules || 450}+ modul fitur`, 'Pairing code, tanpa scan QR']
  el.append(h('section', { class: 'hero' }, heroBg, h('div', { class: 'wrap' },
    h('div', {}, pill, h('h1', {}, c.tagline), h('p', { class: 'lead' }, c.description),
      h('div', { class: 'cta-row' }, h('a', { class: 'btn btn-primary', href: cta }, S.user ? 'Buka Panel' : 'Mulai Gratis'), h('a', { class: 'btn btn-ghost', href: '#/panduan' }, 'Lihat Panduan')),
      h('ul', { class: 'perks' }, perks.map(t => h('li', {}, h('span', { html: ICON.check }), t)))),
    h('div', { class: 'phone', 'aria-hidden': 'true' },
      h('div', { class: 'phone-top' }, h('img', { src: '/icon.svg', width: 40, height: 40, alt: '', style: 'border-radius:50%' }), h('div', {}, h('b', {}, c.botName), h('small', {}, 'online'))),
      h('div', { class: 'phone-body' },
        h('div', { class: 'bub me' }, c.menuCommand || 'menu'),
        h('div', { class: 'bub bot' }, `Halo! Aku ${c.botName}.\n\n• Downloader\n• AI\n• Stiker & Maker\n• Game, Islami, Grup`),
        h('div', { class: 'bub me' }, '.tiktok https://vt.tiktok.com/...'),
        h('div', { class: 'bub bot' }, 'Video berhasil diunduh, lagi dikirim...'))))))

  const track = h('div', { class: 'track' }); const li = c.marquee.map(t => `<li>${esc(t)}</li>`).join('')
  track.innerHTML = `<ul>${li}</ul><ul aria-hidden="true">${li}</ul>`
  el.append(h('section', { class: 'marquee', 'aria-label': 'Kategori fitur' }, track))

  // aktivitas server
  const chartBox = h('div', { class: 'card chart-card' }), statBox = h('div', { class: 'stats' }), srvBox = h('div', { class: 'card servers' })
  const meta = h('p', { class: 'act-meta' }, h('span', { class: 'dot wait' }), h('span', {}, 'Menghubungkan ke server'))
  el.append(h('section', { id: 'aktivitas' }, h('div', { class: 'wrap' },
    h('div', { class: 'sec-head' }, h('div', { class: 'kick' }, h('span', { class: 'dot live' }), 'Live'), h('h2', {}, 'Aktivitas server'), h('p', {}, 'Angka di bawah dibaca langsung dari server ini, bukan contoh.')),
    h('div', { class: 'act' }, chartBox, statBox), srvBox, meta)))
  let timer
  async function tick() {
    try {
      const d = (await api('/api/stats')).data
      const total = d.perMinute.reduce((a, b) => a + b, 0)
      chartBox.innerHTML = `<div class="chart-top"><div><h3>Pesan chat per menit</h3><small>30 menit terakhir</small></div><div class="big">${fmt(total)}</div></div>` + sparkSvg(d.perMinute)
      statBox.replaceChildren(...[['Pesan hari ini', fmt(d.messagesToday)], ['Bot aktif', fmt(d.botsActive)], ['User terdaftar', fmt(d.users)], ['Sedang online', fmt(d.online)], ['Slot tersisa', `${d.slotsLeft}/${d.slotsTotal}`], ['Uptime', up(d.uptime)]]
        .map(([l, n]) => h('div', { class: 'card stat' }, h('div', { class: 'l' }, l), h('div', { class: 'n' }, n))))
      const row = (id, name, st, ok, pct) => h('div', { class: 'srv' }, h('span', { class: 'id' }, id), h('span', {}, name), h('span', { class: 'st' }, h('span', { class: 'dot ' + (ok ? 'live' : 'off') }), st), h('span', { class: 'ld' }, pct == null ? '' : pct + '%'), pct == null ? '' : h('span', { class: 'meter' }, h('i', { style: `width:${pct}%` })))
      srvBox.replaceChildren(
        row('[ 01 ]', 'Gateway web', 'online', true, d.load),
        row('[ 02 ]', 'Bot runtime', `${d.botsActive} bot aktif`, true, Math.round((d.slotsTotal - d.slotsLeft) / Math.max(1, d.slotsTotal) * 100)),
        row('[ 03 ]', 'Chat realtime', `${d.online} online`, true, d.memory))
      meta.replaceChildren(h('span', { class: 'dot live' }), h('span', {}, `Terhubung. Node ${d.node}, diperbarui tiap 5 detik.`))
      $('#hp', el).textContent = `Server online, ${d.botsActive} bot aktif`; $('.status-pill .dot', el).className = 'dot live'
    } catch (e) {
      console.error('[stats]', e)
      meta.replaceChildren(h('span', { class: 'dot off' }), h('span', {}, 'Server tidak merespons.'))
      const hp = $('#hp', el); if (hp) { hp.textContent = 'Server tidak merespons'; $('.status-pill .dot', el).className = 'dot off' }
    }
  }
  tick(); timer = setInterval(tick, 5000)

  el.append(h('section', { id: 'cara', style: 'padding-top:24px' }, h('div', { class: 'wrap' },
    h('div', { class: 'sec-head' }, h('h2', {}, 'Tiga langkah, bot langsung online'), h('p', {}, 'Tidak perlu install apa pun dan tidak perlu sewa server.')),
    h('div', { class: 'steps' }, c.steps.map((s, i) => h('div', { class: 'card step' }, h('div', { class: 'num' }, String(i + 1).padStart(2, '0')), h('h3', {}, s.t), h('p', {}, s.d), h('div', { class: 'hint' }, 'Tekan ', h('kbd', {}, s.k))))))))

  el.append(h('section', { id: 'fitur' }, h('div', { class: 'wrap' },
    h('div', { class: 'sec-head' }, h('h2', {}, 'Kemampuan bot'), h('p', {}, `${c.botName} membawa ratusan modul yang siap dipakai sejak menit pertama.`)),
    h('div', { class: 'feats' }, c.features.map(f => h('div', { class: 'card feat' }, h('div', { class: 'top' }, h('h3', {}, f.t), h('span', { class: 'cnt' }, f.n + ' modul')), h('p', {}, f.d)))))))

  el.append(h('section', { id: 'api' }, h('div', { class: 'wrap api' },
    h('div', {}, h('div', { class: 'sec-head' }, h('h2', {}, 'Pantau server dari aplikasimu'), h('p', {}, 'Endpoint status terbuka untuk umum. Cocok untuk dashboard, bot monitor, atau widget di situs kamu.')),
      h('p', { class: 'api-note' }, 'Dokumentasi lengkap ada di ', h('a', { href: '#/docs' }, 'halaman Docs'), '.')),
    await codeCard())))

  el.append(h('section', { style: 'padding-top:0' }, h('div', { class: 'wrap' },
    h('div', { class: 'sec-head' }, h('h2', {}, 'Bukan cuma bot'), h('p', {}, 'Semua user Zeptrine Cloud bisa ngobrol dan dengerin musik bareng.')),
    h('div', { class: 'comm' },
      h('div', { class: 'card' }, h('div', { class: 'ico', html: ICON.chat }), h('h3', {}, 'Chat semua user'), h('p', {}, 'Satu ruangan untuk semua pengguna. Tanya jawab, tukar tips, atau sekadar nongkrong.'), h('a', { class: 'btn btn-ghost', href: '#/chat' }, 'Buka chat')),
      h('div', { class: 'card' }, h('div', { class: 'ico', html: ICON.note }), h('h3', {}, 'Pemutar musik'), h('p', {}, 'Putar lagu ala Spotify: antrean, acak, ulang, dan favorit. Musik tetap jalan waktu kamu pindah halaman.'), h('a', { class: 'btn btn-ghost', href: '#/music' }, 'Putar musik'))))))

  el.append(h('section', { id: 'faq', style: 'padding-top:0' }, h('div', { class: 'wrap' },
    h('div', { class: 'sec-head' }, h('h2', {}, 'Pertanyaan umum'), h('p', {}, 'Belum terjawab? Hubungi Owner lewat WhatsApp.')),
    h('div', { class: 'faq' }, c.faq.map(([q, a]) => h('details', {}, h('summary', {}, q), h('p', {}, a)))))))

  el.append(h('section', { class: 'cta' }, h('div', { class: 'wrap' }, h('div', { class: 'card cta-box' },
    h('h2', {}, 'Siap bikin bot kamu online?'), h('p', {}, 'Daftar gratis, tautkan nomor, dan bot langsung aktif.'),
    h('div', { class: 'cta-row' }, h('a', { class: 'btn btn-primary', href: cta }, S.user ? 'Buka Panel' : 'Mulai Gratis'), L.whatsapp ? h('a', { class: 'btn btn-ghost', href: 'https://wa.me/' + L.whatsapp, target: '_blank', rel: 'noopener' }, 'Chat Owner') : null)))))

  return { el, destroy: () => clearInterval(timer), scroll: path() === '/fitur' ? 'fitur' : null }
}

/* ---------------- kartu kode API ---------------- */
async function codeCard() {
  const base = location.origin
  const langs = {
    cURL: `curl ${base}/api/stats`,
    JavaScript: `const res = await fetch("${base}/api/stats")\nconst { data } = await res.json()\nconsole.log(data.botsActive, "bot aktif")`,
    Python: `import requests\n\nr = requests.get("${base}/api/stats")\nprint(r.json()["data"]["botsActive"])`,
    Go: `resp, _ := http.Get("${base}/api/stats")\ndefer resp.Body.Close()\nbody, _ := io.ReadAll(resp.Body)\nfmt.Println(string(body))`
  }
  let cur = 'cURL', sample = { status: true, data: '...' }
  try { const j = await api('/api/stats'); const d = Object.assign({}, j.data); d.perMinute = d.perMinute.slice(-5); sample = { status: true, data: d } } catch (e) { /* biarkan */ }
  const pre = h('pre', { class: 'code' }), out = h('pre', { class: 'code' }), tabs = h('div', { class: 'tabs', role: 'tablist' })
  const lines = t => t.split('\n').map((l, i) => `<span class="ln"><i>${i + 1}</i>${esc(l)}</span>`).join('')
  const draw = () => {
    pre.innerHTML = lines(langs[cur])
    tabs.replaceChildren(...Object.keys(langs).map(k => h('button', { class: 'tab' + (k === cur ? ' on' : ''), role: 'tab', 'aria-selected': k === cur, onclick: () => { cur = k; draw() } }, k)))
  }
  draw(); out.innerHTML = lines(JSON.stringify(sample, null, 2))
  return h('div', { class: 'code-card' },
    h('div', { class: 'code-top' }, tabs, h('div', { class: 'method' }, h('b', {}, 'GET'), '/api/stats', h('span', { class: 'ok' }, '200 OK'))),
    pre, h('div', { class: 'resp-h' }, h('span', {}, 'Respons'), h('button', { class: 'copy-btn', onclick: () => copy(JSON.stringify(sample, null, 2), 'Respons disalin') }, 'Salin')), out)
}

/* ---------------- PANDUAN & DOCS ---------------- */
async function Guide() {
  const c = S.cfg
  const step = (t, body) => h('div', { class: 'card' }, h('h3', {}, t), body)
  return { el: h('div', { class: 'wrap page' }, h('h1', {}, 'Panduan'), h('p', { class: 'sub' }, `Cara menjalankan ${c.botName} dari nomor WhatsApp kamu sendiri.`),
    h('div', { class: 'guide' },
      step('1. Buat akun', h('p', {}, 'Buka halaman Daftar, isi username dan password. Aktifkan "Simpan akun" agar data login tersimpan di perangkatmu kalau suatu saat lupa.')),
      step('2. Masukkan nomor bot', h('p', {}, 'Buka Panel, isi nomor WhatsApp yang mau dijadikan bot (contoh 6281234567890), lalu tekan Minta kode pairing.')),
      step('3. Tautkan dari WhatsApp', h('ol', {}, h('li', {}, 'Buka WhatsApp di nomor bot'), h('li', {}, 'Menu titik tiga, lalu Perangkat tertaut'), h('li', {}, 'Tautkan perangkat, lalu Tautkan dengan nomor telepon'), h('li', {}, 'Masukkan kode 8 karakter dari Panel'))),
      step('4. Coba botnya', h('p', {}, `Kirim `, h('b', {}, S.cfg.menuCommand || 'menu'), ' ke nomor bot dari nomor lain atau chat ke diri sendiri. Semua fitur akan tampil.')),
      step('Masalah umum', h('ul', {}, h('li', {}, h('b', {}, 'Kode kedaluwarsa: '), 'kode hanya berlaku 2 menit, minta lagi.'), h('li', {}, h('b', {}, 'Bot diam: '), 'buka Panel, lihat log, lalu Mulai ulang.'), h('li', {}, h('b', {}, 'Slot penuh: '), 'coba lagi nanti atau hubungi admin.'), h('li', {}, h('b', {}, 'Nomor dibatasi WhatsApp: '), 'hindari spam dan pesan massal.'))))) }
}
async function Docs() {
  const rows = [['status', 'boolean', 'Selalu true jika server hidup'], ['data.users', 'number', 'Jumlah akun terdaftar'], ['data.online', 'number', 'User yang sedang online di chat'], ['data.botsActive', 'number', 'Bot yang sedang tertaut & jalan'], ['data.slotsTotal / slotsLeft', 'number', 'Total dan sisa slot bot'], ['data.messagesToday / messagesTotal', 'number', 'Jumlah pesan chat'], ['data.perMinute', 'number[30]', 'Pesan per menit, 30 menit terakhir'], ['data.uptime', 'number', 'Detik sejak server menyala'], ['data.load / memory', 'number', 'Persentase CPU dan RAM server']]
  return { el: h('div', { class: 'wrap page' }, h('h1', {}, 'Docs API'), h('p', { class: 'sub' }, 'Endpoint publik untuk membaca status server. Tidak perlu kunci API.'),
    h('div', { style: 'margin-top:32px;max-width:820px;display:grid;gap:20px' }, await codeCard(),
      h('div', { class: 'card guide', style: 'padding:8px 12px;margin:0;max-width:none' }, h('div', { class: 'tblwrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Field', 'Tipe', 'Keterangan'].map(t => h('th', {}, t)))), h('tbody', {}, rows.map(r => h('tr', {}, r.map(t => h('td', {}, t)))))))))) }
}
routes['/'] = Home; routes['/fitur'] = Home; routes['/panduan'] = Guide; routes['/docs'] = Docs
routes['/404'] = async () => ({ el: h('div', { class: 'wrap page' }, h('h1', {}, '404'), h('p', { class: 'sub' }, 'Halaman tidak ditemukan.'), h('div', { class: 'cta-row' }, h('a', { class: 'btn btn-primary', href: '#/' }, 'Ke beranda'))) })

/* ---------------- LOGIN / DAFTAR ---------------- */
function Auth(mode) {
  return async () => {
    const reg = mode === 'register', c = S.cfg
    const err = h('p', { class: 'msg err', hidden: true })
    const user = h('input', { id: 'u', name: 'username', autocomplete: 'username', placeholder: 'contoh: rendyy', maxlength: 20, autocapitalize: 'none', spellcheck: 'false', required: true })
    const pass = h('input', { id: 'p', name: 'password', type: 'password', autocomplete: reg ? 'new-password' : 'current-password', placeholder: 'Password', required: true })
    const eye = h('button', { class: 'eye', type: 'button', 'aria-label': 'Tampilkan password', html: ICON.eye, onclick: () => { pass.type = pass.type === 'password' ? 'text' : 'password' } })
    const adminKey = h('input', { id: 'ak', name: 'adminKey', autocomplete: 'off', placeholder: 'Kode dari console server' })
    const keep = h('input', { type: 'checkbox', id: 'keep', checked: true })
    const btn = h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, reg ? 'Buat akun' : 'Masuk')
    const card = h('div', { class: 'card auth-card' })
    const savedBox = h('div', { class: 'saved' })

    function drawSaved() {
      const list = store.get('lc_accounts', [])
      savedBox.replaceChildren(); savedBox.hidden = !list.length || reg
      if (!list.length || reg) return
      savedBox.append(h('h4', {}, 'Akun tersimpan di perangkat ini'))
      list.forEach((a, i) => {
        const pw = h('span', {}, '••••••••'); let shown = false
        savedBox.append(h('div', { class: 'acc' }, avatar(a.u), h('div', { class: 'who' }, h('b', {}, a.u), pw),
          h('button', { type: 'button', title: 'Lihat / sembunyikan password', onclick: () => { shown = !shown; pw.textContent = shown ? a.p : '••••••••' } }, shown ? 'Tutup' : 'Lihat'),
          h('button', { type: 'button', onclick: () => { user.value = a.u; pass.value = a.p; submit() } }, 'Pakai'),
          h('button', { type: 'button', 'aria-label': 'Hapus', onclick: () => { const l = store.get('lc_accounts', []); l.splice(i, 1); store.set('lc_accounts', l); drawSaved() } }, '×')))
      })
      savedBox.append(h('p', { class: 'hint' }, 'Tersimpan hanya di browser ini. Jangan aktifkan di perangkat umum.'))
    }
    function remember(u, p) {
      if (!keep.checked) return
      const l = store.get('lc_accounts', []).filter(a => a.u.toLowerCase() !== u.toLowerCase()); l.unshift({ u, p }); store.set('lc_accounts', l.slice(0, 5))
    }
    function created(u, p) {
      card.replaceChildren(h('h1', {}, 'Akun dibuat'), h('p', { class: 'sub' }, 'Simpan data ini baik-baik supaya tidak lupa.'),
        h('div', { class: 'credbox' }, h('div', {}, h('span', {}, 'Username  '), u), h('div', {}, h('span', {}, 'Password  '), p)),
        h('div', { class: 'row2', style: 'margin-top:0' },
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => copy(`Username: ${u}\nPassword: ${p}`, 'Akun disalin') }, 'Salin'),
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { const a = h('a', { href: URL.createObjectURL(new Blob([`${c.name}\nUsername: ${u}\nPassword: ${p}\n`], { type: 'text/plain' })), download: `akun-${u}.txt` }); a.click() } }, 'Unduh .txt')),
        h('button', { class: 'btn btn-primary btn-block', style: 'margin-top:14px', onclick: () => go('/panel') }, 'Lanjut ke Panel'))
    }
    async function submit(e) {
      if (e) e.preventDefault()
      err.hidden = true; btn.disabled = true
      const u = user.value.trim(), p = pass.value
      try {
        const j = await api('/api/auth/' + mode, { method: 'POST', body: { username: u, password: p, adminKey: reg ? adminKey.value.trim() : undefined } })
        S.user = j.user; remember(j.user.username, p); Player.load()
        if (reg) { renderNav(); return created(j.user.username, p) }
        const next = store.get('lc_next', '/panel'); store.set('lc_next', '/panel'); go(next)
      } catch (ex) { err.textContent = ex.message; err.hidden = false } finally { btn.disabled = false }
    }
    const form = h('form', { onsubmit: submit, novalidate: false },
      h('div', { class: 'fg' }, h('label', { for: 'u' }, 'Username'), h('div', { class: 'field' }, user)),
      h('div', { class: 'fg' }, h('label', { for: 'p' }, 'Password'), h('div', { class: 'field' }, pass, eye), reg ? h('p', { class: 'hint' }, 'Minimal 4 karakter. Tidak ada reset otomatis, jadi simpan akunmu.') : null),
      reg ? h('details', { class: 'adm' }, h('summary', {}, 'Daftar sebagai Owner?'), h('div', { class: 'fg' }, h('div', { class: 'field' }, adminKey), h('p', { class: 'hint' }, 'Khusus pemilik. Kode tampil di console saat server dinyalakan.'))) : null,
      h('label', { class: 'chk', for: 'keep' }, keep, h('span', {}, 'Simpan akun di perangkat ini', h('small', {}, 'Supaya bisa dilihat lagi kalau lupa password.'))),
      err, btn)
    card.append(h('div', { class: 'seg' }, h('a', { href: '#/login', class: reg ? '' : 'on' }, 'Masuk'), h('a', { href: '#/register', class: reg ? 'on' : '' }, 'Daftar')),
      h('h1', {}, reg ? 'Buat akun gratis' : 'Selamat datang kembali'), h('p', { class: 'sub' }, reg ? 'Tanpa biaya. Cukup username dan password.' : `Masuk ke ${c.name} untuk mengelola bot.`),
      (reg && !c.registerOpen) ? h('p', { class: 'msg err' }, 'Pendaftaran sedang ditutup.') : form, savedBox)
    drawSaved()
    return { el: h('div', { class: 'auth' }, h('div', { class: 'hero-bg' }, h('span', { class: 'orb a' })), card) }
  }
}
routes['/login'] = Auth('login'); routes['/register'] = Auth('register')

/* ---------------- PANEL BOT ---------------- */
async function Panel() {
  const c = S.cfg
  const box = h('div', { class: 'card pcard' }), side = h('div', { class: 'card pcard' })
  let timer = null, st = null, showLog = false, num = ''
  const engSel = h('select', { id: 'eng', 'aria-label': 'Tipe bot' })
  const numInput = h('input', { id: 'num', type: 'tel', inputmode: 'numeric', autocomplete: 'tel', placeholder: '6281234567890' })
  numInput.addEventListener('input', () => { num = numInput.value })

  const put = (parent, ...k) => parent.append(...k.flat().filter(x => x != null && x !== false))
  const chip = (cls, t) => h('span', { class: 'chip' }, h('span', { class: 'dot ' + cls }), t)
  function draw() {
    const b = st; box.replaceChildren()
    if (!b) return put(box, h('span', { class: 'spin' }))
    if (!b.available) return put(box, h('h2', {}, 'Bot belum siap'), h('p', { class: 'sub' }, S.user.admin ? 'Script bot belum siap (dependensi belum ter-install atau belum ada script). Cek halaman Owner.' : 'Bot belum siap dipakai. Coba lagi nanti atau hubungi admin.'), S.user.admin ? h('a', { class: 'btn btn-primary', href: '#/admin' }, 'Buka halaman Owner') : null)
    const acts = []
    if (b.state === 'idle' || b.state === 'error' || b.state === 'expired' || (b.state === 'stopped' && !b.linked)) {
      put(box, h('div', { class: 'state-head' }, h('h2', {}, 'Tautkan nomor'), b.state === 'error' || b.state === 'expired' ? chip('off', b.state === 'expired' ? 'Kedaluwarsa' : 'Gagal') : null),
        h('p', { class: 'sub' }, 'Masukkan nomor yang mau dijadikan bot, lalu dapatkan kode pairing.'),
        b.error ? h('p', { class: 'msg err' }, b.error) : null,
        (() => { if (b.engines.length < 2) return null; engSel.replaceChildren(...b.engines.map(e => h('option', { value: e.id, selected: e.id === b.activeEngine }, e.name))); return h('div', { class: 'fg' }, h('label', { for: 'eng' }, 'Tipe bot'), h('div', { class: 'field' }, engSel)) })(),
        h('label', { for: 'num' }, 'Nomor WhatsApp'), h('div', { class: 'field' }, h('span', { class: 'pre' }, '+'), numInput),
        h('p', { class: 'hint' }, `Awali dengan kode negara. Slot tersisa: ${b.slotsLeft}/${c.slots}.`),
        h('button', { class: 'btn btn-primary btn-block', style: 'margin-top:14px', id: 'go', onclick: connect }, 'Minta kode pairing'))
    } else if (b.state === 'starting') {
      put(box, h('div', { class: 'state-head' }, h('span', { class: 'spin' }), h('h2', {}, b.linked ? 'Menyalakan bot' : 'Menyiapkan kode')), h('p', { class: 'sub' }, 'Bot sedang dijalankan di server. Biasanya 10-30 detik.'))
    } else if (b.state === 'code') {
      const cd = b.code, tile = (ch, i) => h('span', { class: 'tile', style: `animation-delay:${i * 45}ms` }, ch)
      put(box, h('h2', {}, 'Masukkan kode ini'), h('p', { class: 'sub' }, ['di WhatsApp nomor ', h('b', {}, '+' + b.number)]),
        h('div', { class: 'pcode', title: 'Ketuk untuk menyalin', style: 'cursor:pointer', onclick: () => copy(cd, 'Kode disalin'), 'aria-label': 'Kode pairing ' + cd.split('').join(' ') }, h('div', { class: 'grp' }, cd.slice(0, 4).split('').map(tile)), h('span', { class: 'sep' }, '-'), h('div', { class: 'grp' }, cd.slice(4).split('').map((x, i) => tile(x, i + 4)))),
        h('p', { class: 'timer' }, 'Berlaku ', h('b', { id: 'left' }, dur(b.codeLeft))),
        h('ol', { class: 'how' }, h('li', {}, 'Buka ', h('b', {}, 'WhatsApp'), ', lalu ', h('b', {}, 'Perangkat tertaut')), h('li', {}, 'Ketuk ', h('b', {}, 'Tautkan perangkat')), h('li', {}, 'Pilih ', h('b', {}, 'Tautkan dengan nomor telepon')), h('li', {}, 'Masukkan kode di atas')),
        h('div', { class: 'row2' }, h('button', { class: 'btn btn-ghost btn-sm', onclick: () => copy(cd, 'Kode disalin') }, 'Salin kode'), h('button', { class: 'btn btn-ghost btn-sm', onclick: stop }, 'Batalkan')))
    } else if (b.state === 'online') {
      put(box, h('div', { class: 'big-ok' }, h('div', { class: 'tick', html: ICON.check.replace('18', '28').replace('18', '28') }), h('h3', {}, 'Bot kamu online'),
        h('p', {}, ['Nomor ', h('b', {}, '+' + b.number), '. Kirim ', h('code', {}, S.cfg.menuCommand || 'menu'), ' untuk melihat fitur.'])),
        h('div', { class: 'row2', style: 'margin-top:20px' }, h('button', { class: 'btn btn-ghost btn-sm', onclick: stop }, 'Matikan sementara'), h('button', { class: 'btn btn-danger btn-sm', onclick: logoutBot }, 'Putuskan nomor')))
    } else if (b.state === 'stopped') {
      put(box, h('h2', {}, 'Bot dimatikan'), h('p', { class: 'sub' }, ['Nomor ', h('b', {}, '+' + b.number), ' masih tertaut. Nyalakan lagi kapan saja.']),
        h('div', { class: 'row2', style: 'margin-top:0' }, h('button', { class: 'btn btn-primary btn-sm', onclick: connect }, 'Nyalakan'), h('button', { class: 'btn btn-danger btn-sm', onclick: logoutBot }, 'Putuskan nomor')))
    }
    if (b.state !== 'idle') {
      put(box, h('button', { class: 'copy-btn', style: 'margin-top:14px', onclick: () => { showLog = !showLog; draw() } }, showLog ? 'Sembunyikan log' : 'Lihat log bot'))
      if (showLog) put(box, h('div', { class: 'logbox' }, b.logs.length ? b.logs.join('\n') : 'Belum ada log.'))
    }
    // kartu akun
    side.replaceChildren(h('h2', {}, 'Akunmu'), h('p', { class: 'sub' }, 'Ringkasan akun dan server.'),
      h('div', { class: 'kv' }, h('div', {}, h('span', {}, 'Username'), S.user.username), h('div', {}, h('span', {}, 'Peran'), S.user.admin ? 'Owner' : 'Member'),
        h('div', {}, h('span', {}, 'Status bot'), stateLabel(b.state)), b.engine ? h('div', {}, h('span', {}, 'Tipe bot'), b.engine.name) : null, h('div', {}, h('span', {}, 'Slot server'), `${b.slotsLeft}/${c.slots} tersisa`), h('div', {}, h('span', {}, 'Paket'), 'Gratis')),
      h('div', { class: 'row2' }, h('button', { class: 'btn btn-ghost btn-sm', onclick: changePw }, 'Ganti password'), h('button', { class: 'btn btn-ghost btn-sm', onclick: logout }, 'Keluar')))
  }
  const stateLabel = s => ({ idle: 'Belum tertaut', starting: 'Menyalakan', code: 'Menunggu kode', online: 'Online', stopped: 'Mati', error: 'Gagal', expired: 'Kedaluwarsa' }[s] || s)
  async function refresh() {
    try { st = (await api('/api/bot')).bot; if (document.activeElement !== numInput) draw(); else if (st.state !== 'idle') draw() } catch (e) { if (e.status === 401) { S.user = null; go('/login') } }
    schedule()
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(refresh, st && (st.state === 'starting' || st.state === 'code') ? 1500 : 6000) }
  async function connect() {
    try { st = (await api('/api/bot/connect', { method: 'POST', body: { number: num || numInput.value, engine: engSel.value || undefined } })).bot; draw(); schedule() } catch (e) { toast(e.message, 'err') }
  }
  async function stop() { try { st = (await api('/api/bot/stop', { method: 'POST' })).bot; draw() } catch (e) { toast(e.message, 'err') } }
  async function logoutBot() {
    if (!confirm('Putuskan nomor dan hapus sesi bot? Kamu harus menautkan ulang.')) return
    try { await api('/api/bot/logout', { method: 'POST' }); toast('Nomor diputuskan.', 'ok'); refresh() } catch (e) { toast(e.message, 'err') }
  }
  async function changePw() {
    const old = prompt('Password lama:'); if (old == null) return
    const nw = prompt('Password baru:'); if (nw == null) return
    try { await api('/api/me/password', { method: 'POST', body: { old, new: nw } }); const l = store.get('lc_accounts', []).map(a => a.u === S.user.username ? { u: a.u, p: nw } : a); store.set('lc_accounts', l); toast('Password diganti.', 'ok') } catch (e) { toast(e.message, 'err') }
  }
  const cd = setInterval(() => { const l = $('#left'); if (l && st && st.state === 'code') { st.codeLeft = Math.max(0, st.codeLeft - 1); l.textContent = dur(st.codeLeft) } }, 1000)
  const el = h('div', { class: 'wrap page' }, h('h1', {}, 'Panel bot'), h('p', { class: 'sub' }, `Halo ${S.user.username}. Kelola bot ${c.botName} kamu di sini.`), h('div', { class: 'panel' }, box, side))
  draw(); refresh()
  return { el, destroy: () => { clearTimeout(timer); clearInterval(cd) } }
}
routes['/panel'] = Panel


/* ---------------- ADMIN: ENGINE BOT ---------------- */
async function Admin() {
  let list = [], mig = null, timer, logId = null
  const auto = h('input', { type: 'checkbox', id: 'auto', checked: store.get('lc_mig', true) })
  auto.addEventListener('change', () => store.set('lc_mig', auto.checked))
  const box = h('div', { class: 'card pcard' }), form = h('div', { class: 'card pcard' })
  const stChip = e => ({ ready: chipEl('live', 'Siap'), installing: chipEl('wait', 'Menginstal'), failed: chipEl('off', 'Gagal'), 'needs-install': chipEl('wait', 'Perlu install') }[e.status])
  const chipEl = (cls, t) => h('span', { class: 'chip' }, h('span', { class: 'dot ' + cls }), t)
  function draw() {
    box.replaceChildren(h('h2', {}, 'Engine bot'), h('p', { class: 'sub' }, 'Script bot yang tersedia. Ganti kapan saja, sesi user ikut pindah otomatis.'),
      h('label', { class: 'chk', for: 'auto' }, auto, h('span', {}, 'Pindahkan semua user saat ganti script', h('small', {}, 'Sesi WhatsApp dipindah, user tidak perlu menautkan ulang. Bot yang sedang jalan di-restart otomatis.'))))
    if (mig && (mig.running || Date.now() - (mig.finishedAt || 0) < 120000)) {
      box.append(h('div', { class: 'msg ' + (mig.failed.length ? 'err' : 'ok') }, mig.running ? `Memindahkan user ke ${mig.targetName}: ${mig.done}/${mig.total}...` : `Selesai memindahkan ${mig.total - mig.failed.length}/${mig.total} user ke ${mig.targetName}.`,
        mig.failed.length ? h('div', { style: 'margin-top:6px;font-size:13px' }, mig.failed.map(f => `${f.user}: ${f.error}`).join('; ')) : null))
    }
    if (!list.length) box.append(h('div', { class: 'empty', style: 'padding:24px 0' }, 'Belum ada engine. Upload zip script bot di sebelah.'))
    list.forEach(e => {
      const row = h('div', { class: 'eng' },
        h('div', { class: 'eng-h' }, h('div', {}, h('b', {}, e.name), h('small', {}, `${e.entry || '-'} · ${e.mode === 'cwd' ? 'folder per user' : 'sesi via argumen'} · ${e.users} user tertaut`)), h('div', { class: 'eng-tags' }, e.active ? h('span', { class: 'tag' }, 'AKTIF') : null, stChip(e))),
        h('div', { class: 'eng-a' },
          e.active ? h('button', { class: 'btn btn-ghost btn-sm', onclick: () => act('/api/admin/engines/active', 'POST', { id: e.id, migrate: true }) }, 'Pindahkan semua user ke sini') : h('button', { class: 'btn btn-ghost btn-sm', disabled: e.status !== 'ready', onclick: () => act('/api/admin/engines/active', 'POST', { id: e.id, migrate: auto.checked }) }, 'Jadikan aktif'),
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => act('/api/admin/engines/install', 'POST', { id: e.id }) }, 'Install ulang'),
          h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { logId = logId === e.id ? null : e.id; draw() } }, logId === e.id ? 'Tutup log' : 'Log'),
          e.legacy ? null : h('button', { class: 'btn btn-danger btn-sm', onclick: () => { if (confirm(`Hapus engine "${e.name}"?`)) act('/api/admin/engines/' + e.id, 'DELETE') } }, 'Hapus')))
      if (logId === e.id) row.append(h('div', { class: 'logbox' }, e.log.length ? e.log.join('\n') : 'Belum ada log install.'))
      box.append(row)
    })
  }
  async function load() {
    clearTimeout(timer)
    try { const j = await api('/api/admin/engines'); list = j.engines; mig = j.migration; draw() } catch (e) { toast(e.message, 'err') }
    timer = setTimeout(load, list.some(x => x.status === 'installing') || (mig && mig.running) ? 2000 : 8000)
  }
  async function act(url, method, body) {
    try { const j = await api(url, { method, body }); list = j.engines; if (j.migration) mig = j.migration; draw(); load() } catch (e) { toast(e.message, 'err') }
  }
  // form upload
  const name = h('input', { placeholder: 'contoh: Zeptrine Official' }), file = h('input', { type: 'file', accept: '.zip,application/zip' })
  const modeSel = h('select', {}, h('option', { value: 'auto' }, 'Otomatis (disarankan)'), h('option', { value: 'arg' }, 'Sesi lewat argumen (mis. azbry.js)'), h('option', { value: 'cwd' }, 'Folder terpisah per user (mis. start.js)'))
  const entry = h('input', { placeholder: 'kosong = otomatis (azbry.js / start.js / index.js)' }), prompt = h('input', { placeholder: 'default: Masukkan nomor bot' }), code = h('input', { placeholder: 'default: Pairing Code : XXXX-XXXX' })
  const bar = h('div', { class: 'splash-bar', style: 'width:100%;margin-top:12px', hidden: true }, h('i'))
  const btn = h('button', { class: 'btn btn-primary btn-block', type: 'button' }, 'Upload & pasang')
  btn.addEventListener('click', () => {
    const f = file.files[0]
    if (!f) return toast('Pilih file .zip dulu.', 'err')
    const q = new URLSearchParams({ name: name.value.trim() || f.name.replace(/\.zip$/i, ''), entry: entry.value.trim(), prompt: prompt.value.trim(), code: code.value.trim(), mode: modeSel.value })
    btn.disabled = true; btn.textContent = 'Mengunggah...'; bar.hidden = false
    const x = new XMLHttpRequest()
    x.open('POST', '/api/admin/engines/upload?' + q); x.setRequestHeader('Content-Type', 'application/octet-stream')
    x.upload.onprogress = ev => { if (ev.lengthComputable) $('i', bar).style.width = (ev.loaded / ev.total * 100) + '%' }
    x.onload = () => {
      btn.disabled = false; btn.textContent = 'Upload & pasang'; bar.hidden = true
      let j = {}; try { j = JSON.parse(x.responseText) } catch (e) { /* abaikan */ }
      if (x.status === 200 && j.ok) { toast('Terunggah. Dependensi sedang di-install.', 'ok'); list = j.engines; file.value = ''; draw(); load() } else toast(j.error || 'Upload gagal.', 'err')
    }
    x.onerror = () => { btn.disabled = false; btn.textContent = 'Upload & pasang'; bar.hidden = true; toast('Upload gagal, cek koneksi.', 'err') }
    x.send(f)
  })
  const fld = (label, input, hint) => h('div', { class: 'fg' }, h('label', {}, label), h('div', { class: 'field' }, input), hint ? h('p', { class: 'hint' }, hint) : null)
  form.append(h('h2', {}, 'Upload script bot'), h('p', { class: 'sub' }, 'Zip berisi script bot (mis. Zeptrine.zip). Folder session lama otomatis dilewati.'),
    fld('Nama engine', name), h('div', { class: 'fg' }, h('label', {}, 'File zip'), h('div', { class: 'field filefld' }, file)),
    h('details', { class: 'adm' }, h('summary', {}, 'Pengaturan lanjutan (untuk script lain)'), fld('Jenis script', modeSel, 'Otomatis mengenali azbry.js dan start.js (Zeptrine Official).'), fld('File utama', entry), fld('Teks prompt nomor', prompt, 'Teks yang muncul di console saat bot minta nomor.'), fld('Regex kode pairing', code, 'Grup tangkapan digabung jadi kode.')),
    btn, bar,
    h('p', { class: 'hint', style: 'margin-top:14px' }, 'Upload dengan nama yang sama akan memperbarui script tanpa menghapus sesi user. Hanya admin yang boleh upload karena script berjalan di server ini.'))
  load()
  return { el: h('div', { class: 'wrap page' }, h('h1', {}, 'Owner'), h('p', { class: 'sub' }, 'Pasang dan ganti script bot langsung dari website.'), h('div', { class: 'panel', style: 'grid-template-columns:1.2fr 1fr' }, box, form)), destroy: () => clearTimeout(timer) }
}
routes['/admin'] = Admin

/* ---------------- CHAT GLOBAL ---------------- */
async function ChatView() {
  const c = S.cfg
  const list = h('div', { class: 'msgs', 'aria-live': 'polite' }), online = h('span', { class: 'chip' }, h('span', { class: 'dot live' }), '0 online'), users = h('div', {})
  const ta = h('textarea', { rows: 1, maxlength: c.chatMax, placeholder: 'Tulis pesan...' , 'aria-label': 'Pesan'})
  const send = h('button', { class: 'btn btn-primary', type: 'button' }, 'Kirim')
  const pill = h('button', { class: 'newpill', hidden: true, onclick: () => { toBottom(); } }, 'Pesan baru')
  let last = null, es = null, msgs = []
  const near = () => list.scrollHeight - list.scrollTop - list.clientHeight < 90
  const toBottom = () => { list.scrollTop = list.scrollHeight; pill.hidden = true }
  const linkify = t => { const f = document.createDocumentFragment(); t.split(/(https?:\/\/[^\s]+)/g).forEach(p => /^https?:\/\//.test(p) ? f.append(h('a', { href: p, target: '_blank', rel: 'noopener noreferrer' }, p)) : f.append(p)); return f }
  function node(m, cont) {
    const mine = m.uid === S.user.id
    const row = h('div', { class: 'm' + (cont ? ' cont' : '') + (mine ? ' mine' : ''), 'data-id': m.id },
      avatar(m.username), h('div', { style: 'min-width:0;flex:1' }, h('div', { class: 'mh' }, h('b', {}, m.username), m.admin ? h('span', { class: 'tag' }, 'OWNER') : null, h('time', {}, clock(m.ts))), h('div', { class: 'txt' }, linkify(m.text))))
    if (mine || S.user.admin) row.append(h('button', { class: 'x', 'aria-label': 'Hapus pesan', html: ICON.x, onclick: async () => { try { await api('/api/chat/' + m.id, { method: 'DELETE' }) } catch (e) { toast(e.message, 'err') } } }))
    return row
  }
  function add(m) {
    if (msgs.some(x => x.id === m.id)) return
    const stick = near() || m.uid === S.user.id
    const cont = last && last.uid === m.uid && m.ts - last.ts < 120000
    msgs.push(m); last = m
    const e = list.querySelector('.empty'); if (e) e.remove()
    list.insertBefore(node(m, cont), pill)
    if (stick) toBottom(); else pill.hidden = false
  }
  function redraw(all) {
    msgs = []; last = null; list.replaceChildren(pill)
    if (!all.length) list.insertBefore(h('div', { class: 'empty' }, 'Belum ada pesan. Jadi yang pertama menyapa!'), pill)
    all.forEach(add); toBottom()
  }
  async function history() { try { const j = await api('/api/chat/history'); redraw(j.messages); presence(j.online, j.users) } catch (e) { toast(e.message, 'err') } }
  function presence(n, us) {
    online.replaceChildren(h('span', { class: 'dot live' }), `${n} online`)
    users.replaceChildren(...us.map(u => h('div', { class: 'ou' }, avatar(u), u)))
  }
  function connect() {
    es = new EventSource('/api/chat/stream')
    es.addEventListener('message', ev => add(JSON.parse(ev.data)))
    es.addEventListener('delete', ev => { const { id } = JSON.parse(ev.data); const n = list.querySelector(`[data-id="${id}"]`); if (n) n.remove(); msgs = msgs.filter(m => m.id !== id); last = msgs[msgs.length - 1] || null })
    es.addEventListener('presence', ev => { const d = JSON.parse(ev.data); presence(d.count, d.users) })
    let first = true; es.onopen = () => { if (!first) history(); first = false }
  }
  async function submit() {
    const t = ta.value.trim(); if (!t) return
    send.disabled = true
    try { await api('/api/chat/send', { method: 'POST', body: { text: t } }); ta.value = ''; ta.style.height = 'auto' } catch (e) { toast(e.message, 'err') } finally { send.disabled = false; ta.focus() }
  }
  send.addEventListener('click', submit)
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } })
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px' })
  list.addEventListener('scroll', () => { if (near()) pill.hidden = true })
  const el = h('div', { class: 'wrap chat-page' },
    h('div', { class: 'chat' },
      h('div', { class: 'card chat-main' }, h('div', { class: 'chat-head' }, h('h2', {}, 'Chat semua user'), online), list, h('div', { class: 'composer' }, ta, send)),
      h('div', { class: 'card chat-side' }, h('h3', {}, 'Sedang online'), users)))
  history().then(connect)
  return { el, destroy: () => { if (es) es.close() } }
}
routes['/chat'] = ChatView

/* ---------------- PEMUTAR MUSIK ---------------- */
const Player = {
  audio: null, tracks: [], mine: [], likes: new Set(), queue: [], idx: -1, shuffle: false, repeat: 'off', loaded: false, subs: new Set(),
  init() {
    this.audio = $('#audio'); this.audio.volume = store.get('lc_vol', 0.8)
    const a = this.audio
    a.addEventListener('ended', () => this.next(true))
    a.addEventListener('play', () => this.emit()); a.addEventListener('pause', () => this.emit())
    a.addEventListener('timeupdate', () => this.tick()); a.addEventListener('loadedmetadata', () => this.tick())
    a.addEventListener('error', () => { if (this.cur()) { toast('Lagu tidak bisa diputar, lanjut ke berikutnya.', 'err'); this.next(true) } })
    document.addEventListener('keydown', e => {
      if (e.code === 'Space' && this.cur() && !/INPUT|TEXTAREA|BUTTON|SUMMARY/.test(document.activeElement.tagName)) { e.preventDefault(); this.toggle() }
    })
    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession
      ms.setActionHandler('play', () => this.toggle()); ms.setActionHandler('pause', () => this.toggle())
      ms.setActionHandler('previoustrack', () => this.prev()); ms.setActionHandler('nexttrack', () => this.next())
    }
  },
  async load() {
    try { const j = await api('/api/music'); this.tracks = j.tracks; this.mine = j.mine; this.likes = new Set(j.likes); this.loaded = true } catch (e) { /* abaikan */ }
    this.emit()
  },
  reset(full) { if (full) { this.mine = []; this.likes = new Set(); this.emit() } },
  cur() { return this.queue[this.idx] || null },
  on(fn) { this.subs.add(fn); return () => this.subs.delete(fn) },
  emit() { this.render(); this.subs.forEach(f => f()) },
  play(list, i) {
    this.queue = list.slice(); this.idx = i
    const t = this.cur(); if (!t) return
    this.audio.src = t.src; this.audio.play().catch(() => {})
    document.body.classList.add('has-player'); $('#player').hidden = false
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist })
    this.emit()
  },
  toggle() { if (!this.cur()) return; this.audio.paused ? this.audio.play() : this.audio.pause() },
  next(auto) {
    if (!this.queue.length) return
    if (auto && this.repeat === 'one') { this.audio.currentTime = 0; return this.audio.play() }
    let i
    if (this.shuffle && this.queue.length > 1) { do { i = Math.floor(Math.random() * this.queue.length) } while (i === this.idx) }
    else { i = this.idx + 1; if (i >= this.queue.length) { if (this.repeat === 'all' || !auto) i = 0; else { this.audio.pause(); this.audio.currentTime = 0; return this.emit() } } }
    this.play(this.queue, i)
  },
  prev() {
    if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return }
    this.play(this.queue, (this.idx - 1 + this.queue.length) % this.queue.length)
  },
  async like(t) {
    if (!S.user) { toast('Login dulu untuk menyimpan favorit.'); return go('/login') }
    const on = !this.likes.has(t.id)
    try { const j = await api('/api/music/like', { method: 'POST', body: { id: t.id, on } }); this.likes = new Set(j.likes); this.emit() } catch (e) { toast(e.message, 'err') }
  },
  tick() {
    const a = this.audio, r = $('#seek'); if (!r) return
    if (!r.dataset.drag) { r.value = a.duration ? (a.currentTime / a.duration) * 1000 : 0; r.style.setProperty('--p', r.value / 10 + '%') }
    const t1 = $('#t1'), t2 = $('#t2'); if (t1) t1.textContent = dur(a.currentTime); if (t2) t2.textContent = dur(a.duration)
  },
  render() {
    const box = $('#player'), t = this.cur(); if (!t) return
    const playing = !this.audio.paused
    box.replaceChildren(
      h('div', { class: 'pl-l' }, h('div', { class: 'cv', style: t.cover ? `background-image:url(${t.cover})` : `background:${grad(t.title)}`, html: t.cover ? '' : ICON.note }),
        h('div', { class: 'nm' }, h('b', {}, t.title), h('span', {}, t.artist)),
        h('button', { class: 'tbtn hide-m' + (this.likes.has(t.id) ? ' on' : ''), 'aria-label': 'Favorit', html: ICON.heart, onclick: () => this.like(t) })),
      h('div', { class: 'pl-c' },
        h('div', { class: 'ctrls' },
          h('button', { class: 'tbtn hide-m' + (this.shuffle ? ' on' : ''), 'aria-label': 'Acak', html: ICON.shuffle, onclick: () => { this.shuffle = !this.shuffle; this.emit() } }),
          h('button', { class: 'tbtn', 'aria-label': 'Sebelumnya', html: ICON.prev, onclick: () => this.prev() }),
          h('button', { class: 'play', 'aria-label': playing ? 'Jeda' : 'Putar', html: playing ? ICON.pause : ICON.play, onclick: () => this.toggle() }),
          h('button', { class: 'tbtn', 'aria-label': 'Berikutnya', html: ICON.next, onclick: () => this.next() }),
          h('button', { class: 'tbtn hide-m' + (this.repeat !== 'off' ? ' on' : ''), 'aria-label': 'Ulangi: ' + this.repeat, title: 'Ulangi: ' + this.repeat, html: ICON.repeat + (this.repeat === 'one' ? '<b style="font-size:10px;margin-left:1px">1</b>' : ''), onclick: () => { this.repeat = { off: 'all', all: 'one', one: 'off' }[this.repeat]; this.emit() } })),
        h('div', { class: 'prog' }, h('time', { id: 't1' }, '0:00'),
          h('input', { type: 'range', id: 'seek', min: 0, max: 1000, value: 0, 'aria-label': 'Posisi lagu',
            oninput: e => { e.target.dataset.drag = 1; e.target.style.setProperty('--p', e.target.value / 10 + '%') },
            onchange: e => { delete e.target.dataset.drag; if (this.audio.duration) this.audio.currentTime = e.target.value / 1000 * this.audio.duration } }),
          h('time', { id: 't2' }, '0:00'))),
      h('div', { class: 'pl-r' }, h('span', { style: 'color:var(--muted);display:inline-flex', html: ICON.vol }),
        h('input', { type: 'range', min: 0, max: 100, value: Math.round(this.audio.volume * 100), 'aria-label': 'Volume', style: `--p:${this.audio.volume * 100}%`,
          oninput: e => { this.audio.volume = e.target.value / 100; e.target.style.setProperty('--p', e.target.value + '%'); store.set('lc_vol', this.audio.volume) } }),
        h('a', { class: 'tbtn', href: '#/music', 'aria-label': 'Buka pustaka musik', html: ICON.note })))
    this.tick()
  }
}

async function MusicView() {
  const c = S.cfg
  if (!Player.loaded) await Player.load()
  let tab = 'all', q = ''
  const main = h('div', { class: 'mmain' }), side = h('div', { class: 'side' })
  const titles = { all: ['Semua lagu', 'Koleksi Zeptrine Cloud'], likes: ['Favorit', 'Lagu yang kamu suka'], mine: ['Lagu saya', 'Lagu dari URL milikmu'] }
  const listFor = () => {
    const base = tab === 'all' ? Player.tracks : tab === 'likes' ? [...Player.tracks, ...Player.mine].filter(t => Player.likes.has(t.id)) : Player.mine
    const s = q.trim().toLowerCase()
    return s ? base.filter(t => (t.title + ' ' + t.artist).toLowerCase().includes(s)) : base
  }
  const cover = (t, extra) => h('div', { class: 'cv', style: t.cover ? `background-image:url(${t.cover})` : `background:${grad(t.title)}`, html: t.cover ? '' : ICON.note })
  function drawSide() {
    const item = (k, label, n, ic) => h('button', { class: 'lib' + (tab === k ? ' on' : ''), onclick: () => { tab = k; if ((k === 'likes' || k === 'mine') && !S.user) { toast('Login dulu untuk memakai ini.'); return go('/login') } draw() } },
      h('span', { class: 'cv', style: `background:${k === 'likes' ? 'linear-gradient(135deg,#6b6b6b,#1f1f1f)' : k === 'mine' ? 'linear-gradient(135deg,#4d4d4d,#141414)' : 'linear-gradient(135deg,#8a8a8a,#2a2a2a)'}`, html: ic }), h('span', {}, label, h('small', {}, n + ' lagu')))
    side.replaceChildren(h('h3', {}, 'Pustaka'), item('all', 'Semua lagu', Player.tracks.length, ICON.note), item('likes', 'Favorit', [...Player.tracks, ...Player.mine].filter(t => Player.likes.has(t.id)).length, ICON.heart), item('mine', 'Lagu saya', Player.mine.length, ICON.note))
    if (S.user && c.allowUserTracks) {
      const t = h('input', { placeholder: 'Judul lagu' }), a = h('input', { placeholder: 'Artis' }), u = h('input', { placeholder: 'https://.../lagu.mp3', type: 'url' })
      side.append(h('div', { class: 'addbox' }, h('h3', { style: 'padding:0 0 8px' }, 'Tambah lagu (URL)'),
        h('div', { class: 'fg' }, h('div', { class: 'field' }, t)), h('div', { class: 'fg' }, h('div', { class: 'field' }, a)), h('div', { class: 'fg' }, h('div', { class: 'field' }, u)),
        h('button', { class: 'btn btn-ghost btn-sm btn-block', onclick: async () => {
          try { const j = await api('/api/music/add', { method: 'POST', body: { title: t.value, artist: a.value, url: u.value } }); Player.mine.push(j.track); tab = 'mine'; toast('Lagu ditambahkan.', 'ok'); draw() } catch (e) { toast(e.message, 'err') }
        } }, 'Tambah')))
    }
  }
  function draw() {
    drawSide()
    const list = listFor(), [title, subt] = titles[tab], cur = Player.cur(), playing = !Player.audio.paused
    const inList = cur && list.some(t => t.id === cur.id)
    main.style.setProperty('--hue', '#4a4a4a')
    const search = h('input', { type: 'search', placeholder: 'Cari lagu atau artis', value: q, 'aria-label': 'Cari lagu' })
    search.addEventListener('input', () => { q = search.value; drawRows() })
    const rows = h('div', { class: 'trows' })
    function drawRows() {
      const l = listFor(); rows.replaceChildren()
      if (!l.length) return rows.append(h('div', { class: 'empty' }, tab === 'all' ? 'Belum ada lagu. Taruh file .mp3 di folder public/music.' : q ? 'Tidak ada hasil.' : tab === 'likes' ? 'Belum ada favorit. Ketuk ikon hati pada lagu.' : 'Belum ada lagu pribadi. Tambah lewat URL di samping.'))
      l.forEach((t, i) => {
        const isCur = cur && cur.id === t.id
        rows.append(h('div', { class: 'trow' + (isCur ? ' cur' : '') + (isCur && !playing ? ' paused' : ''), onclick: () => (isCur ? Player.toggle() : Player.play(l, i)) },
          h('div', { class: 'ix' }, isCur ? h('span', { class: 'eq' }, h('i'), h('i'), h('i')) : String(i + 1)),
          h('div', { class: 'ti' }, cover(t), h('div', { class: 'nm' }, h('b', {}, t.title), h('span', {}, t.artist))),
          h('button', { class: Player.likes.has(t.id) ? 'liked' : '', 'aria-label': 'Favorit', html: ICON.heart, onclick: e => { e.stopPropagation(); Player.like(t) } }),
          tab === 'mine' ? h('button', { class: 'del', 'aria-label': 'Hapus', html: ICON.x, onclick: async e => { e.stopPropagation(); try { await api('/api/music/mine/' + t.id, { method: 'DELETE' }); Player.mine = Player.mine.filter(x => x.id !== t.id); draw() } catch (er) { toast(er.message, 'err') } } }) : h('span')))
      })
    }
    drawRows()
    main.replaceChildren(
      h('div', { class: 'mhead' }, h('div', { class: 'art', style: `background:${grad(title)}`, html: ICON.note.replace('22', '56').replace('22', '56') }),
        h('div', {}, h('small', {}, 'PLAYLIST'), h('h1', {}, title), h('p', {}, `${subt} · ${list.length} lagu`))),
      h('div', { class: 'mbar' },
        h('button', { class: 'playbig', 'aria-label': 'Putar', html: inList && playing ? ICON.pause : ICON.play, onclick: () => { if (inList) Player.toggle(); else if (list.length) Player.play(list, 0) } }),
        h('button', { class: 'tbtn' + (Player.shuffle ? ' on' : ''), 'aria-label': 'Acak', html: ICON.shuffle, onclick: () => { Player.shuffle = !Player.shuffle; if (!Player.cur() && list.length) Player.play(list, Math.floor(Math.random() * list.length)); Player.emit() } }),
        h('label', { class: 'search', style: 'margin-bottom:0' }, search)),
      rows)
  }
  const off = Player.on(() => { if (path() === '/music') { const y = window.scrollY; draw(); window.scrollTo(0, y) } })
  draw()
  return { el: h('div', { class: 'wrap page', style: 'padding-top:32px' }, h('div', { class: 'mus' }, side, main)), destroy: off }
}
routes['/music'] = MusicView

/* ---------------- boot ---------------- */
async function boot() {
  const bar = $('#splashBar'), pct = $('#splashPct'); let p = 0
  const setP = v => { p = Math.max(p, Math.min(100, v)); bar.style.width = p + '%'; pct.textContent = Math.round(p) + '%' }
  const iv = setInterval(() => setP(p + (90 - p) * 0.08), 90)
  const t0 = Date.now()
  try { S.cfg = await api('/api/config') } catch (e) { S.cfg = { name: 'Zeptrine Cloud', tagline: 'Server tidak terhubung', description: '', features: [], steps: [], faq: [], marquee: [], links: {}, theme: {}, slots: 0 }; toast(e.message, 'err') }
  applyTheme(); setP(60)
  try { S.user = (await api('/api/me')).user } catch (e) { S.user = null }
  Player.init(); Player.load(); setP(85)
  await render()
  const wait = Math.max(0, 900 - (Date.now() - t0))
  setTimeout(() => { clearInterval(iv); setP(100); setTimeout(() => $('#splash').classList.add('done'), 200) }, wait)
}
boot()
})()
