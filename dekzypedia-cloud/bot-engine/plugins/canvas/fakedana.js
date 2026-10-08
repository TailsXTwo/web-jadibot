// plugins/fakedana.js
const pluginConfig = {
  name: "fakedana",
  alias: ['fdana', 'danafake'],
  category: "canvas",
  description: "Membuat screenshot notifikasi saldo DANA palsu (have fun only)",
  usage: ".fakedana <nominal>",
  example: ".fakedana 150000",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const API_BASE = "https://api.synoxcloud.xyz/canvas/fake-dana";
const API_KEY = "FREE";

// ⚠️ Warning legal
const DISCLAIMER =
  "\n\n⚠️ _Ini hanya hasil editan untuk have fun / prank. " +
  "Dilarang digunakan untuk penipuan, manipulasi bukti transfer, " +
  "atau tindakan ilegal lainnya._";

async function handler(m, ctx = {}) {
  const conn = ctx.conn || ctx.client || ctx.sock || m?.conn || m?.client;
  const usedPrefix = ctx.usedPrefix ?? ctx.prefix ?? m?.prefix ?? ".";
  const command = ctx.command ?? ctx.cmd ?? m?.command ?? "fakedana";

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
        `💸 *Fake DANA Screenshot Generator*\n\n` +
        `⚠️ _Hanya untuk have fun / prank, bukan untuk penipuan!_\n\n` +
        `*Cara pakai:*\n` +
        `${usedPrefix}${command} <nominal>\n\n` +
        `*Contoh:*\n` +
        `${usedPrefix}${command} 150000\n` +
        `${usedPrefix}${command} 1000000`
      );
    }

    // Bersihkan jadi angka saja
    const nominal = text.replace(/[^0-9]/g, "");

    if (!nominal) {
      return m.reply(
        `⚠️ Nominal tidak valid.\n` +
        `Masukkan angka, contoh: *${usedPrefix}${command} 150000*`
      );
    }

    if (nominal.length > 12) {
      return m.reply(`⚠️ Nominal terlalu besar. Maksimal 12 digit.`);
    }

    await m.reply("💸 Membuat screenshot DANA, mohon tunggu...");

    const url = `${API_BASE}?nominal=${encodeURIComponent(nominal)}&apikey=${API_KEY}`;
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

    // Format nominal dengan pemisah ribuan
    const formatted = Number(nominal).toLocaleString("id-ID");

    await conn.sendMessage(
      m.chat,
      {
        image: buffer,
        caption:
          `💸 *Fake DANA Screenshot*\n\n` +
          `💰 Nominal: *Rp ${formatted}*\n` +
          DISCLAIMER,
      },
      { quoted: m }
    );
  } catch (err) {
    console.error("[fakedana] error:", err);
    try {
      await m.reply(`❌ Gagal membuat screenshot DANA:\n${err.message || err}`);
    } catch (_) {}
  }
}

export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };