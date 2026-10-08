import {
  getCategories,
  getCommandsByCategory
} from "../../src/lib/plugins.js";

const CATEGORY_ORDER = [
  "owner",
  "main",
  "utility",
  "tools",
  "fun",
  "game",
  "download",
  "downloader",
  "search",
  "sticker",
  "media",
  "ai",
  "group",
  "religi",
  "islamic",
  "info",
  "cek",
  "economy",
  "user",
  "canvas",
  "random",
  "premium",
  "ephoto",
  "jpm",
  "pushkontak",
  "anime",
  "asupan",
  "clan",
  "convert",
  "berita",
  "rpg",
  "nsfw",
  "linode",
  "primbon",
  "cecan",
  "stalker",
  "tts",
  "vps",
  "panel",
  "store"
];

const config = {
  name: "allmenu",
  alias: ["fullmenu"],
  category: "main",
  description: "Menampilkan semua command plugin",
  usage: ".allmenu",
  example: ".allmenu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true
};

async function handler(m, { config: botConfig }) {
  const prefix =
    m.prefix ||
    botConfig?.command?.prefix ||
    ".";

  const categories = getCategories() || [];
  const commandsByCategory =
    getCommandsByCategory() || {};

  const sorted = [...categories].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(
      String(a).toLowerCase()
    );

    const ib = CATEGORY_ORDER.indexOf(
      String(b).toLowerCase()
    );

    return (
      (ia === -1 ? 999 : ia) -
      (ib === -1 ? 999 : ib)
    );
  });

  let text = `〄 𝗔𝗟𝗟 - 𝗠𝗘𝗡𝗨

〄 𝗜𝗡𝗙𝗢 - 𝗨𝗦𝗘𝗥
┌────────────────
│ 〄 Nama   : ${m.pushName || "User"}
│ 〄 Status : ${
    m.isOwner
      ? "Owner"
      : m.isPremium
        ? "Premium"
        : "Free"
  }
│ 〄 Nomor  : @${String(m.sender || "").split("@")[0]}
│ 〄 Prefix : ${prefix}
└────────────────

`;

  let totalCommand = 0;
  let totalCategory = 0;

  for (const category of sorted) {
    const cat = String(category).toLowerCase();

    if (cat === "owner" && !m.isOwner) {
      continue;
    }

    const commands =
      commandsByCategory?.[category] ||
      commandsByCategory?.[cat] ||
      [];

    if (!Array.isArray(commands) || !commands.length) {
      continue;
    }

    totalCategory++;

    text += `〄 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬 - ${cat.toUpperCase()}
┌────────────────
`;

    for (const command of commands) {
      const name =
        typeof command === "string"
          ? command
          : command?.name;

      if (!name) continue;

      text += `│ 〄 ${prefix}${name}\n`;
      totalCommand++;
    }

    text += `└────────────────

`;
  }

  text += `〄 𝗜𝗡𝗙𝗢 - 𝗠𝗘𝗡𝗨
┌────────────────
│ 〄 Total Command  : ${totalCommand}
│ 〄 Total Category : ${totalCategory}
│ 〄 Prefix         : ${prefix}
└────────────────`;

  await m.reply(text);
}

export default {
  config,
  handler
};