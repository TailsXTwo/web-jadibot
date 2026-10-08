# Zeptrine Cloud

Website jadibot WhatsApp dengan gaya Violetics: beranda, **login & daftar** (username + password, bisa disimpan),
**panel bot** (pairing code), **chat semua user** (realtime), dan **pemutar musik ala Spotify**.
Semuanya **gratis, tanpa paket/harga**. Tanpa dependency: cukup Node.js 18+ (tidak perlu `npm install`).

## Menjalankan

```bash
npm start
```

Buka http://localhost:3000 (atau IP:PORT server kamu).

## Pasang script bot (dari website, tanpa folder manual)

1. Lihat **kode admin** di console saat server nyala (juga tersimpan di `data/admin.key`).
2. Buka halaman **Daftar**, isi username admin (default `admin` atau `rendyy`, atur di `config.js` > `ADMINS`),
   buka "Daftar sebagai admin?" lalu isi kode admin.
3. Buka menu **Admin**, upload `Zeptrine.zip`. Dependensi di-install otomatis, lalu engine aktif.
4. Selesai. User biasa tinggal daftar dan menautkan nomor dari **Panel**.

**Ganti script kapan saja:** di menu Admin tekan "Jadikan aktif" pada script baru. Dengan opsi
"Pindahkan semua user" (default nyala), sesi WhatsApp semua user dipindah ke script baru dan bot yang sedang
jalan di-restart otomatis, jadi user **tidak perlu menautkan ulang**. Balik ke script lama juga bisa dengan cara yang sama.
Database bot tiap script tetap di script masing-masing (tidak dicampur).

Script yang dikenali otomatis:
- **Zeptrine Official** (`start.js`): sesinya fix di folder `session`, jadi tiap user dijalankan di folder kerja sendiri
  (`_jb/jb_<id>/`) berisi symlink ke script + salinan folder data JSON (`database/`, dst). `index.js` (launcher) dilewati.
  Script ini hanya menerima nomor berawalan 62.
- **azbry.js** (mis. Lynea-MD): nama sesi dikirim lewat argumen.
Semua bot memakai `settings.js` milik script yang sama (owner, nama bot, API key).

Bisa upload banyak script sekaligus. Engine aktif dipakai user baru, atau user memilih sendiri "Tipe bot" di Panel.
Upload dengan nama yang sama = update script tanpa menghapus sesi user. Script selain Zeptrine Official: isi
"Pengaturan lanjutan" (file utama, teks prompt nomor, regex kode pairing).

Cara kerja: server menjalankan `node <file utama> jb_<idUser>` di folder engine, mengisi nomor otomatis,
lalu menampilkan kode pairing ke user. Script bot **tidak diubah**. Tiap user punya sesi & database sendiri.
Catatan: tiap bot memakai RAM sekitar 150-300 MB. Atur `MAX_TOTAL_BOTS`.

Di belakang domain/proxy? Sudah didukung. Jika muncul "Origin ... tidak diizinkan", tambahkan domain ke `ALLOWED_ORIGINS`.

## Pengaturan (config.js)

| Bagian | Isi |
|---|---|
| `server.*` | port, admin, batas slot bot, folder bot, batas chat, folder musik |
| `site.name / tagline / description` | nama dan teks utama |
| `site.theme` | warna brand dan mode default (dark/light) |
| `site.heroVideo` | video latar hero (kosong = animasi bawaan) |
| `site.links` | WhatsApp admin, Instagram, GitHub, TikTok, saluran |
| `site.marquee / features / steps / faq` | teks di beranda |

Restart server setelah mengubah `config.js`.

## Musik

Taruh file `.mp3` di `public/music/`. Format nama `Artis - Judul.mp3`; cover opsional dengan nama sama (`.jpg`/`.png`).
User login juga bisa menambah lagu pribadi lewat URL dan menandai favorit.
Tiga lagu bawaan adalah demo buatan sendiri, boleh dihapus.

## Akun & password

- Password disimpan ter-hash (scrypt). Opsi "Simpan akun" menyimpan username+password di browser user sendiri.
- Lupa password dan akun tersimpan hilang: `node scripts/reset-password.js <username> <passwordBaru>`
- Admin (`server.ADMINS`) bisa menghapus pesan siapa pun di chat.

## Deploy

- Jalankan di belakang nginx / Cloudflare (`TRUST_PROXY: true`). Untuk chat realtime, matikan buffering:
  `proxy_buffering off;` pada lokasi `/api/chat/stream`.
- Agar tetap hidup: `pm2 start server.js --name zeptrine-cloud`
- Backup: folder `data/` (akun, chat) dan folder sesi `jb_*` di folder bot.

## API publik

`GET /api/stats` mengembalikan status server (lihat halaman Docs di website).

## Struktur

```
config.js        semua pengaturan
server.js        server HTTP + API
lib/             store, auth, chat, bots, music
public/          index.html, css/, js/app.js, music/
scripts/         reset-password.js
data/            database.json (dibuat otomatis)
```

## Pterodactyl

Egg Node.js 18+, RAM minimal 1 GB (+300 MB per bot). Upload isi zip, taruh bot di `bot-engine/`, startup command `npm start`. Pakai allocation utama sebagai port.

## Ganti script bot (cara lama, via config)

Bot bisa diganti kapan saja: kosongkan `bot-engine/`, taruh script baru, lalu sesuaikan di `config.js`:
`BOT_ENTRY` (file utama), `BOT_PROMPT` dan `BOT_CODE_REGEX` (teks prompt nomor & kode pairing di console bot).
Syarat script: nama sesi bisa dikirim sebagai argumen pertama, nomor dibaca dari stdin, kode pairing dicetak ke console,
dan kredensial disimpan di `<sesi>/creds.json` (format Baileys). Setelah ganti script, hapus folder `jb_*` lama agar user menautkan ulang.
