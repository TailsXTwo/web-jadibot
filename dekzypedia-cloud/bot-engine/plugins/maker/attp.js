import {
  fetchImage,
  ephotoUrl,
  toStickerWebp,
} from "../../src/lib/makerHelper.js";

const config = {
  name: "attp",
  alias: ["atextpict"],
  category: "maker",
  description: "Mengubah teks menjadi stiker bergerak",
  usage: ".attp <teks>",
  example: ".attp shinobu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = String(m.text || "").trim();

  if (!text) {
    return m.reply(
      `〄 *ATTP MAKER*\n\n` +
        `┌──────────────\n` +
        `│ 〄 Masukkan teks\n` +
        `│\n` +
        `│ 〄 Contoh:\n` +
        `│ ${m.prefix}attp shinobu\n` +
        `└──────────────`
    );
  }

  try {
    await m.react("🕐");

    // ATTP selalu dikirim sebagai sticker, bukan image.
    const image = await fetchImage(ephotoUrl("multicoloredneon", text));
    const sticker = await toStickerWebp(image);

    await sock.sendMessage(m.chat, { sticker }, { quoted: m });

    await m.react("✅");
  } catch (error) {
    console.error("[attp]", error);
    await m.react("❌");

    return m.reply(`❌ *Gagal membuat ATTP!*\n\n> ${error.message}`);
  }
}

export default { config, handler };
