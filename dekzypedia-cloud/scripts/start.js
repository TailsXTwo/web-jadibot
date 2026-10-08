// npm start: pasang dependency bot (sekali saja) di bot-engine, lalu jalankan website.
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const cfg = require('../config').server
const { detect } = require('../lib/engines')

const dir = cfg.BOT_DIR
const found = detect(dir)
const hasBot = !!found || fs.existsSync(path.join(dir, cfg.BOT_ENTRY))
if (found) console.log(`[bot-engine] terdeteksi: ${found.entry} (${found.mode === 'cwd' ? 'folder per user' : 'sesi via argumen'})`)
if (!hasBot) {
  // Normal: script bot di-upload lewat halaman Admin di website (bukan lewat folder).
  console.log('\n[i] Belum ada script bot. Daftar sebagai admin, lalu upload zip bot di halaman Admin.\n')
} else if (fs.existsSync(path.join(dir, 'package.json')) && !fs.existsSync(path.join(dir, 'node_modules'))) {
  console.log('[bot-engine] node_modules belum ada, menjalankan npm install (pertama kali bisa beberapa menit)...')
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit', shell: true })
  if (r.status !== 0) console.log('[bot-engine] npm install gagal. Coba manual: cd bot-engine && npm install')
}
require('../server')
