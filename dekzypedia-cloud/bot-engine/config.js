import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const asset = (...segments) => path.join(__dirname, "storage", "temp", ...segments);

export default {
  usePairingCode: true,

  botNumber: "6287892152231",

  bot: {
    name: "Zeptrine AI",
    developer: "t.me/rendyysantana",
  },

  owner: {
    number: ["6285829658816"], // nomor owner, tanpa +, tanpa spasi
  },

  premium: { number: [] },
  partner: { number: [] },

  // Role helper compatibility for older plugins that call appConfig.isOwner(),
  // appConfig.isPremium(), or appConfig.isPartner() directly.
  isOwner(value) {
    const needle = String(value ?? "").replace(/[^0-9]/g, "");
    const list = Array.isArray(this.owner?.number) ? this.owner.number : [this.owner?.number];
    return !!needle && list.filter(Boolean).some((item) => String(item).replace(/[^0-9]/g, "") === needle);
  },

  isPremium(value) {
    const needle = String(value ?? "").replace(/[^0-9]/g, "");
    const list = Array.isArray(this.premium?.number) ? this.premium.number : [this.premium?.number];
    return !!needle && list.filter(Boolean).some((item) => String(item).replace(/[^0-9]/g, "") === needle);
  },

  isPartner(value) {
    const needle = String(value ?? "").replace(/[^0-9]/g, "");
    const list = Array.isArray(this.partner?.number) ? this.partner.number : [this.partner?.number];
    return !!needle && list.filter(Boolean).some((item) => String(item).replace(/[^0-9]/g, "") === needle);
  },

  saluran: {
    id: "13000xxxxxxxxx@newsletter",
    name: "Zeptrine Pedia",
  },


  channels: {
    autoFollow: ["120000xxxxxxxxxx@newsletter"],
  },

  command: {
    prefix: ".",
    caseSensitive: false,
  },

  // Runtime feature switches used by newer plugins.
  registration: {
    enabled: false,
    rewards: { koin: 30000, energi: 300, exp: 300000 },
  },

  features: {
    smartTriggers: false,
    energySystem: true,
  },

  // Penyedia API untuk plugin kategori "maker".
  // Dokumentasi: https://api.ranggacode.my.id/docs
  api: {
  baseUrl: "https://api.ranggacode.my.id",
  apikey: "SHINOBU-MD",
  openrouterKey: process.env.OPENROUTER_API_KEY || ""
},

  assets: {
    "shinobu-daftar": asset("shinobu-daftar.jpg"),
    "shinobu": asset("shinobu.jpg"),
    "menu-image": asset("menu-image.jpg"),
    "menu-thumb": asset("menu-thumb.jpg"),
    "menu-video": asset("menu-video.mp4"),
  },

  // Panel/VPS settings
  pterodactyl: {
    ownerPanels: [],
    sellers: [],
    server1: { 
    domain: "https://", 
    apikey: "plta_", 
    nestid: 1, 
    egg: 5, 
    location: 1 
    },
    // Cpanel Server 2
    server2: { 
    domain: "https://", 
    apikey: "plta_", 
    nestid: 1, 
    egg: 5, 
    location: 1 
    }
  },
  digitalocean: { token: "", region: "sgp1", sellers: [], ownerPanels: [] },
  APIkey: { linode: "" },
};
