/* ==========================================================================
 *  ZEPTRINE CLOUD - PUSAT PENGATURAN
 *  Semua setting website ada di file ini. Edit lalu restart server (npm start).
 *
 *  - Blok `server` : RAHASIA, tidak pernah dikirim ke browser.
 *  - Blok `site`   : tampil di website (nama, warna, teks, link, dll).
 * ========================================================================== */
const path = require('path')

module.exports = {

  /* ===================== SERVER (rahasia) ===================== */
  server: {
    PORT: Number(process.env.SERVER_PORT || process.env.PORT) || 3000,   // Pterodactyl otomatis mengisi SERVER_PORT
    HOST: '0.0.0.0',
    DATA_DIR: path.join(__dirname, 'data'),      // tempat database.json (akun & chat)
    SESSION_DAYS: 30,                            // login bertahan berapa hari
    ALLOWED_ORIGINS: [],                         // domain tambahan yang boleh, mis. ['https://jadibot.domainku.com']
    TRUST_PROXY: true,                           // true jika di belakang nginx / cloudflare

    // Username yang jadi ADMIN (bisa hapus pesan siapa pun di chat).
    // Admin tetap harus daftar dulu lewat halaman Daftar.
    // Pemilik website. Daftar dengan salah satu username ini + kode owner untuk dapat akses penuh.
    ADMINS: ['owner', 'rendyysantanaa'],

    REGISTER_OPEN: true,                         // false = pendaftaran ditutup
    USERNAME_MIN: 3,
    USERNAME_MAX: 20,
    PASSWORD_MIN: 4,

    /* ---- Jadibot: menjalankan script Zeptrine Official (azbry.js) per user ---- */
    // Folder penyimpanan engine bot. Script bot di-upload dari halaman Admin di website
    // (atau boleh langsung ditaruh di sini: bot-engine/azbry.js).
    // Kode rahasia untuk mendaftar sebagai admin. Kosong = dibuat otomatis (lihat console / data/admin.key).
    ADMIN_KEY: '',
    BOT_DIR: process.env.ZEPTRINE_BOT_DIR || path.join(__dirname, 'bot-engine'),
    BOT_ENTRY: 'azbry.js',
    BOT_ARGS: [],
    // Cara website "membaca" bot. Sesuaikan jika script bot lain punya teks berbeda:
    BOT_PROMPT: 'Masukkan nomor bot',            // teks yang muncul saat bot minta nomor (regex, tidak peka huruf besar)
    BOT_CODE_REGEX: 'Pairing Code\\s*:\\s*([A-Z0-9]{4})-?([A-Z0-9]{4})', // regex kode pairing (grup 1+2 digabung)                                // argumen tambahan untuk bot
    MAX_TOTAL_BOTS: 20,                          // slot bot maksimal (tiap bot makan RAM 150-300MB)
    AUTO_RESTORE: true,                          // nyalakan lagi bot yang sudah tertaut saat server restart
    PAIRING_TIMEOUT_SEC: 120,                    // batas tunggu kode pairing / penautan
    DEFAULT_COUNTRY: '62',                       // nomor berawalan 0 diubah jadi 62

    /* ---- Batas anti spam ---- */
    CHAT_MAX_LEN: 500,
    CHAT_COOLDOWN_MS: 800,                       // jeda antar pesan per user
    CHAT_KEEP: 300,                              // riwayat chat yang disimpan
    AUTH_MAX_TRIES: 15,                          // percobaan login/daftar per IP per 10 menit

    /* ---- Musik ---- */
    MUSIC_DIR: path.join(__dirname, 'public', 'music'), // taruh file mp3 di sini, otomatis muncul
    ALLOW_USER_TRACKS: true                      // user boleh tambah lagu lewat URL (pribadi)
  },

  /* ===================== SITE (tampil di browser) ===================== */
  site: {
    name: 'Zeptrine Cloud',
    tagline: 'Bot WhatsApp tanpa coding, online dalam semenit',
    description: 'Tautkan nomor WhatsApp kamu, bot langsung aktif dengan 434+ modul fitur. Gratis, tanpa VPS.',
    developer: 'rendyysantanaa',
    botName: 'Zeptrine Official',
    menuCommand: '.menu',                        // perintah yang dicontohkan di beranda dan panduan (Zeptrine pakai prefix titik)
    totalModules: 434,                           // angka "434+ modul" di beranda (dihitung dari plugins/ Zeptrine)
    year: 2026,

    // Tema: hitam putih. Mau warna lain? Isi brand, mis. brand: '#7c3aed' (tombol jadi berwarna).
    theme: {
      brand: '',
      brand2: '',
      defaultMode: 'dark'                        // 'dark' (hitam) atau 'light' (putih)
    },

    // Video latar hero (opsional). Kosongkan '' untuk animasi bawaan.
    heroVideo: '',

    // Kontak & sosial media (kosongkan '' untuk menyembunyikan)
    links: {
      whatsapp: '6287892152231',                 // nomor admin, tanpa + atau spasi
      instagram: 'https://instagram.com/rendyyfirmansyahh11_',
      github: '',
      tiktok: '',
      channel: ''                                // link saluran WhatsApp
    },

    // Teks berjalan di bawah hero
    marquee: ['RPG', 'Group', 'Maker', 'Cek', 'Tools', 'Fun', 'Canvas', 'Owner', 'Panel', 'AI',
      'Downloader', 'Prombon', 'Store', 'Game', 'User', 'Anime', 'Religi', 'Sticker', 'Economy', 'VPS'],

    // Kartu "Kemampuan bot" (jumlah modul dihitung dari folder plugins/ Zeptrine)
    features: [
      { t: 'RPG & Ekonomi', n: 68, d: 'Sistem level, koin, energi, dan progres RPG lengkap.' },
      { t: 'Group', n: 76, d: 'Kelola grup: antilink, sambutan, mode, dan moderasi otomatis.' },
      { t: 'Maker & Canvas', n: 56, d: 'Bikin gambar, teks kreatif, dan desain langsung dari chat.' },
      { t: 'Cek', n: 40, d: 'Cek macam-macam info dan status dengan cepat.' },
      { t: 'Fun', n: 32, d: 'Fitur hiburan dan mini-game santai untuk grup.' },
      { t: 'Tools', n: 30, d: 'Alat bantu harian: konversi, utilitas, dan pengingat.' },
      { t: 'Owner & Panel', n: 41, d: 'Kontrol penuh untuk owner bot dan pengaturan panel.' },
      { t: 'User', n: 17, d: 'Profil, statistik, dan pengaturan akun pengguna.' },
      { t: 'AI & Downloader', n: 14, d: 'Ngobrol dengan AI dan unduh media dari berbagai platform.' }
    ],

    // Tiga langkah di beranda
    steps: [
      { t: 'Daftar & isi nomor bot', d: 'Buat akun gratis, lalu masukkan nomor yang mau jadi bot.', k: 'Tautkan nomor' },
      { t: 'Tautkan dari WhatsApp', d: 'Masukkan kode pairing seperti menautkan WhatsApp Web.', k: 'Perangkat tertaut' },
      { t: 'Bot online', d: 'Chat nomor bot kamu sendiri untuk melihat semua perintah.', k: 'menu' }  // Zeptrine pakai prefix titik: kirim ".menu"
    ],

    faq: [
      ['Apa itu jadibot?', 'Jadibot menjalankan nomor WhatsApp kamu sendiri sebagai bot. Kamu tautkan nomornya sebagai perangkat tertaut, lalu bot menjawab perintah memakai fitur Zeptrine Official.'],
      ['Apakah layanan ini resmi dari WhatsApp?', 'Bukan. Ini layanan tidak resmi yang menautkan akun kamu seperti perangkat tertaut biasa. Cocok untuk proyek pribadi dan komunitas kecil.'],
      ['Apakah nomor saya bisa diblokir?', 'Bisa. Pemicunya spam dan pesan massal ke orang yang tidak kenal. Jangan pakai nomor utama kamu untuk bot.'],
      ['Benar-benar gratis?', 'Ya. Tidak ada paket dan tidak ada tagihan. Slot bot terbatas, jadi kalau penuh coba lagi nanti.'],
      ['Bagaimana kalau bot tidak merespons?', 'Buka Panel, cek log bot, lalu tekan Restart. Kalau masih diam, hapus perangkat dari WhatsApp dan tautkan ulang.'],
      ['Lupa password?', 'Aktifkan "Simpan akun" saat login supaya tersimpan di perangkat ini. Kalau tetap lupa, chat admin untuk reset.']
    ]
  }
}
