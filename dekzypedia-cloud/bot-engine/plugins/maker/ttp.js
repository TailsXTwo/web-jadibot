import { runTextMaker, ephotoUrl } from "../../src/lib/makerHelper.js";

const config = {
  name: "ttp",
  alias: ["texttopict"],
  category: "maker",
  description: "Mengubah teks menjadi sticker (text to picture)",
  usage: ".ttp <teks>",
  example: ".ttp shinobu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  return runTextMaker(m, sock, {
    title: "TTP MAKER",
    name: config.name,
    example: "shinobu",
    // TTP identik dengan sticker teks, jadi hasilnya dikirim sebagai sticker.
    asSticker: true,
    buildUrl: (text) => ephotoUrl("typographytext", text),
  });
}

export default { config, handler };
