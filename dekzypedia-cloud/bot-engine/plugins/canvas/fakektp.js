// plugins/ektp.js
const pluginConfig = {
  name: "ektp",
  alias: ['fakektp', 'ktp'],
  category: "canvas",
  description: "Membuat E-KTP palsu (bohongan / for fun only)",
  usage: ".ektp <provinsi> | <kota> | <nik> | <nama> | <ttl> | <jk> | <goldar> | <alamat> | <rt/rw> | <desa> | <kecamatan> | <agama> | <status> | <pekerjaan> | <kewarganegaraan> | <masa_berlaku> | <terbuat> | <pas_photo_url>",
  example: ".ektp prefektur tokyo | nerima | 2112090309120001 | doraemon | matsushiba, 03-09-2112 | laki-laki | Dorayaki | rumah keluarga nobi | 005/002 | nerima | tsukimidai | Dorayakisme | menikah | robot | WNA | seumur hidup | 03-09-2112 | https://k.top4top.io/p_3816oexr91.jpg",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const API_BASE = "https://api.synoxcloud.xyz/canvas/e-ktp";
const API_KEY = "FREE";

const FIELDS = [
  "provinsi",
  "kota",
  "nik",
  "nama",
  "ttl",
  "jenis_kelamin",
  "golongan_darah",
  "alamat",
  "rt_rw",
  "kel_desa",
  "kecamatan",
  "agama",
  "status",
  "pekerjaan",
  "kewarganegaraan",
  "masa_berlaku",
  "terbuat",
  "pas_photo",
];

async function handler(m, ctx = {}) {
  const conn = ctx.conn || ctx.client || ctx.sock || m?.conn || m?.client;
  const usedPrefix = ctx.usedPrefix ?? ctx.prefix ?? m?.prefix ?? ".";
  const command = ctx.command ?? ctx.cmd ?? m?.command ?? "ektp";

  try {
    let text =
      (ctx.text ?? ctx.body ?? m?.text ?? m?.body ?? "").trim() ||
      (ctx.args ? ctx.args.join(" ") : "");

    // Buang prefix + command dari awal
    if (text.startsWith(usedPrefix)) text = text.slice(usedPrefix.length);
    const parts = text.split(/\s+/);
    if (parts[0]?.toLowerCase() === command.toLowerCase()) parts.shift();
    text = parts.join(" ").trim();

    if (!text) {
      return m.reply(
        `🪪 *Fake E-KTP Generator*\n\n` +
        `⚠️ _Hanya untuk have fun, hasil bohongan!_\n\n` +
        `*Format:*\n` +
        `${usedPrefix}${command} <data1> | <data2> | ... | <data18>\n\n` +
        `*Urutan data (18):*\n` +
        `1. Provinsi\n` +
        `2. Kota/Kabupaten\n` +
        `3. NIK (16 digit)\n` +
        `4. Nama\n` +
        `5. Tempat, Tanggal Lahir\n` +
        `6. Jenis Kelamin\n` +
        `7. Golongan Darah\n` +
        `8. Alamat\n` +
        `9. RT/RW\n` +
        `10. Kelurahan/Desa\n` +
        `11. Kecamatan\n` +
        `12. Agama\n` +
        `13. Status Perkawinan\n` +
        `14. Pekerjaan\n` +
        `15. Kewarganegaraan\n` +
        `16. Masa Berlaku\n` +
        `17. Terbuat\n` +
        `18. URL Pas Photo\n\n` +
        `*Contoh minimal:*\n` +
        `${usedPrefix}${command} jawa barat | bandung | 3273010101010001 | Budi | Bandung, 01-01-2001 | laki-laki | O | Jl. Merdeka No.1 | 001/002 | Sukajadi | Sukajadi | Islam | Belum Menikah | Pelajar | WNI | seumur hidup | 01-01-2020 | https://i.ibb.co/xxxx/photo.jpg`
      );
    }

    // Split dengan pemisah "|"
    const values = text.split("|").map((s) => s.trim());

    if (values.length < 18) {
      return m.reply(
        `⚠️ *Data kurang!*\n\n` +
        `Dibutuhkan *18 data*, kamu hanya kirim *${values.length}*.\n\n` +
        `Ketik *${usedPrefix}${command}* tanpa argumen untuk lihat format lengkap.`
      );
    }

    // Ambil 18 nilai pertama
    const data = {};
    for (let i = 0; i < FIELDS.length; i++) {
      data[FIELDS[i]] = values[i] || "-";
    }

    // Validasi minimal: NIK & URL foto
    if (!/^\d{16}$/.test(data.nik)) {
      return m.reply(`⚠️ NIK harus 16 digit angka. Diterima: \`${data.nik}\``);
    }
    if (!/^https?:\/\//.test(data.pas_photo)) {
      return m.reply(`⚠️ URL pas photo tidak valid: \`${data.pas_photo}\``);
    }

    await m.reply("🪪 Membuat E-KTP palsu, mohon tunggu...");

    // Build query string
    const qs = new URLSearchParams();
    for (const key of FIELDS) qs.set(key, data[key]);
    qs.set("apikey", API_KEY);

    const url = `${API_BASE}?${qs.toString()}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const contentType = res.headers.get("content-type") || "";

    let buffer;
    if (contentType.includes("application/json")) {
      const json = await res.json();
      const imgUrl =
        json?.result?.url || json?.result || json?.url || json?.data?.url || json?.data;
      if (typeof imgUrl !== "string" || !/^https?:\/\//.test(imgUrl)) {
        throw new Error("Response JSON tidak mengandung URL gambar.");
      }
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) throw new Error(`Gagal unduh gambar: ${imgRes.status}`);
      buffer = Buffer.from(await imgRes.arrayBuffer());
    } else if (
      contentType.startsWith("image/") ||
      contentType === "application/octet-stream"
    ) {
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      const ab = await res.arrayBuffer();
      buffer = Buffer.from(ab);
      if (!buffer.length) throw new Error("Response kosong.");
    }

    if (!buffer || !buffer.length) throw new Error("Gambar kosong.");

    await conn.sendMessage(
      m.chat,
      {
        image: buffer,
        caption:
          `🪪 *Fake E-KTP*\n\n` +
          `👤 Nama: *${data.nama}*\n` +
          `🆔 NIK: \`${data.nik}\`\n` +
          `🏙️ ${data.kota}, ${data.provinsi}\n\n` +
          `⚠️ _Hasil bohongan — hanya untuk have fun!_`,
      },
      { quoted: m }
    );
  } catch (err) {
    console.error("[ektp] error:", err);
    try {
      await m.reply(`❌ Gagal membuat E-KTP:\n${err.message || err}`);
    } catch (_) {}
  }
}

export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };