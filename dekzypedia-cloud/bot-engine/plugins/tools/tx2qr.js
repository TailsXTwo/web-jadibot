// plugins/tools/txt2qr.js
// SHINOBU MD — TEXT TO QR CODE

import axios from "axios";

const config = {
  name: "txt2qr",
  alias: ["texttoqr", "qrcode", "qrcreate"],
  category: "tools",
  description: "Generate QR code dari teks",
  usage: ".txt2qr <text>",
  example: ".txt2qr https://google.com",

  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,

  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = String(
    m.args?.join(" ") ||
    m.text ||
    ""
  )
    .trim()
    .replace(/^\S+\s*/, "");

  if (!text) {
    return m.reply(
      `📱 *ᴛᴇxᴛ ᴛᴏ Qʀ*\n\n` +
      `> Masukkan teks atau URL.\n\n` +
      `Contoh:\n` +
      `\`${m.prefix}txt2qr https://google.com\``
    );
  }

  try {
    await m.react("📱");

    const response = await axios.get(
      "https://api-faa.my.id/faa/qr-create",
      {
        params: {
          text,
        },
        responseType: "arraybuffer",
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024,
        maxBodyLength: 10 * 1024 * 1024,
      }
    );

    const imageBuffer =
      Buffer.from(response.data);

    if (!imageBuffer.length) {
      throw new Error(
        "QR Code kosong."
      );
    }

    const preview =
      text.length > 100
        ? `${text.substring(0, 100)}...`
        : text;

    await sock.sendMessage(
      m.chat,
      {
        image: imageBuffer,
        caption:
          `📱 *Qʀ ᴄᴏᴅᴇ*\n\n` +
          `> ${preview}`,
      },
      {
        quoted: m,
      }
    );

    await m.react("✅");

  } catch (error) {
    console.error(
      "[TXT2QR] Error:",
      error?.response?.status ||
      error?.message ||
      error
    );

    try {
      await m.react("❌");
    } catch {}

    return m.reply(
      `❌ *ɢᴀɢᴀʟ ᴍᴇᴍʙᴜᴀᴛ Qʀ*\n\n` +
      `> Gagal menghubungi layanan QR.\n` +
      `> Silakan coba lagi beberapa saat kemudian.`
    );
  }
}

export default {
  config,
  handler,
};