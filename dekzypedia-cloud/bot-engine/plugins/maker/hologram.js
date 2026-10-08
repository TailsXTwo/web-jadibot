import { runTextMaker, ephotoUrl } from "../../src/lib/makerHelper.js";

const config = {
  name: "hologram",
  alias: ["holo", "hologramlogo"],
  category: "maker",
  description: "Membuat teks bergaya hologram futuristik",
  usage: ".hologram <teks>",
  example: ".hologram shinobu",
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
    title: "HOLOGRAM",
    name: config.name,
    example: "shinobu",
    buildUrl: (text) => ephotoUrl("neonglitch", text),
  });
}

export default { config, handler };
