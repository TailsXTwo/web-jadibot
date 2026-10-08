import { runTextMaker, ephotoUrl } from "../../src/lib/makerHelper.js";

const config = {
  name: "pubg",
  alias: ["pubglogo", "logopubg"],
  category: "maker",
  description: "Membuat logo bergaya PUBG dari teks",
  usage: ".pubg <teks>",
  example: ".pubg shinobu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

async function handler(m, { sock }) {
  return runTextMaker(m, sock, {
    title: "PUBG LOGO",
    name: config.name,
    example: "shinobu",
    buildUrl: (text) => ephotoUrl("freecreate", text),
  });
}

export default { config, handler };
