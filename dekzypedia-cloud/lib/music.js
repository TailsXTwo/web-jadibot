// Daftar lagu: file di folder MUSIC_DIR (otomatis) + lagu pribadi user (URL).
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const EXT = new Set(['.mp3', '.m4a', '.ogg', '.wav', '.flac', '.aac', '.opus'])
const IMG = ['.jpg', '.jpeg', '.png', '.webp']
const hid = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 10)

function scan(dir) {
  let files = []
  try { files = fs.readdirSync(dir) } catch (e) { return [] }
  const set = new Set(files)
  const out = []
  for (const f of files.sort()) {
    const ext = path.extname(f).toLowerCase()
    if (!EXT.has(ext)) continue
    const base = path.basename(f, ext)
    let artist = 'Unknown', title = base
    const m = base.match(/^(.+?)\s+-\s+(.+)$/)
    if (m) { artist = m[1].trim(); title = m[2].trim() }
    const coverFile = IMG.map(e => base + e).find(n => set.has(n))
    const src = '/music/' + encodeURIComponent(f)
    out.push({ id: hid(src), title, artist, src, cover: coverFile ? '/music/' + encodeURIComponent(coverFile) : '' })
  }
  return out
}

function validUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' } catch (e) { return false }
}
module.exports = { scan, validUrl, hid }
