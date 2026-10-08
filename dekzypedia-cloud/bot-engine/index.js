import config from "./config.js";

import { serialize } from "./src/lib/serialize.js";

import {
  loadPlugins,
  getPluginByCommand,
  checkCooldown,
} from "./src/lib/plugins.js";

import { getDatabase } from "./src/lib/database.js";
import { runGroupGuard } from "./src/lib/groupGuard.js";
import { installSignalLogFilter } from "./src/lib/signalLogFilter.js";
import { startConnection } from "./src/connection.js";
import { runSpecialHandlers } from "./src/lib/featureRuntime.js";

installSignalLogFilter();

const startTime = Date.now();

let db;

// ==========================================
// MESSAGE DISPATCH
// (logic sama persis kayak sebelumnya, cuma sekarang dipanggil
// dari src/connection.js lewat callback onMessages)
// ==========================================

async function handleMessages(sock, { messages, type }) {
  if (type !== "notify") {
    return;
  }

  for (const msg of messages) {
    try {
      // =================================
      // SERIALIZE
      // =================================

      const m = await serialize(sock, msg, sock.store);

      if (!m) {
        continue;
      }

      // =================================
      // BAN CHECK
      // =================================

      if (m.isBanned) {
        continue;
      }

      // =================================
      // GROUP GUARD
      // =================================

      if (await runGroupGuard(m, { sock, db })) {
        continue;
      }

      if (m.isGroup && db.getGroup(m.chat).isBanned && !m.isOwner) {
        continue;
      }

      // =================================
      // INTERACTIVE / SPECIAL HANDLERS
      // =================================

      if (await runSpecialHandlers(m, {
        sock,
        config,
        db,
        uptime: Math.floor((Date.now() - startTime) / 1000),
      }, globalThis.plugins ? new Map(Object.entries(globalThis.plugins)) : new Map())) {
        continue;
      }

      // =================================
      // PENTING:
      // PESAN BOT SENDIRI BOLEH
      // JIKA ITU COMMAND
      //
      // - fromMe + command -> DIPROSES
      // - fromMe + bukan command -> SKIP
      // - isBot + command -> DIPROSES
      // - isBot + bukan command -> SKIP
      // =================================

      if ((m.fromMe || m.isBot) && !m.isCommand) {
        continue;
      }

      // =================================
      // AUTO RESPON
      // =================================

      if (!m.isCommand) {
        // Karena pesan bot sendiri sudah disaring di atas,
        // autorespon tidak akan membalas dirinya sendiri.

        try {
          const autoData = db.setting("autorespon", {});

          if (
            autoData?.enabled !== false &&
            autoData?.replies &&
            typeof autoData.replies === "object"
          ) {
            const incomingText = String(m.text || "").trim().toLowerCase();

            if (incomingText) {
              const replies = autoData.replies;

              // ===========================
              // EXACT MATCH
              // ===========================

              if (Object.prototype.hasOwnProperty.call(replies, incomingText)) {
                await m.reply(String(replies[incomingText]));
                continue;
              }

              // ===========================
              // KEYWORD MATCH
              // ===========================

              for (const [trigger, response] of Object.entries(replies)) {
                const keyword = String(trigger).trim().toLowerCase();

                if (keyword && incomingText.includes(keyword)) {
                  await m.reply(String(response));
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.error("[autorespon]", err);
        }

        continue;
      }

      // =================================
      // COMMAND
      // =================================

      const plugin = getPluginByCommand(m.command);

      if (!plugin) {
        continue;
      }

      const { config: p } = plugin;

      // =================================
      // REGISTRATION GATE
      // =================================

      const registrationRequired =
        db.setting("registrationRequired") === true ||
        config.registration?.enabled === true;

      if (registrationRequired && !m.isOwner && !m.isPremium && !p.skipRegistration) {
        const user = db.getUser(m.sender);
        if (!user?.isRegistered) {
          await m.reply(`📝 Kamu belum terdaftar. Ketik ${m.prefix || "."}daftar dulu.`);
          continue;
        }
      }

      // =================================
      // OWNER CHECK
      // =================================

      if (p.isOwner && !m.isOwner) {
        await m.reply("🚫 Perintah ini khusus owner.");
        continue;
      }

      // =================================
      // PREMIUM CHECK
      // =================================

      if (p.isPremium && !m.isPremium && !m.isOwner) {
        await m.reply("💎 Perintah ini khusus user premium.");
        continue;
      }

      // =================================
      // GROUP CHECK
      // =================================

      if (p.isGroup && !m.isGroup) {
        await m.reply("👥 Perintah ini hanya bisa dipakai di dalam grup.");
        continue;
      }

      // =================================
      // ADMIN / BOT-ADMIN CHECK
      // =================================

      if (p.isAdmin && !m.isAdmin && !m.isOwner) {
        await m.reply("🚫 Perintah ini khusus admin grup.");
        continue;
      }

      if (p.isBotAdmin && !m.isBotAdmin && !m.isOwner) {
        await m.reply("⚠️ Jadikan bot sebagai admin grup dulu.");
        continue;
      }

      // =================================
      // PRIVATE CHECK
      // =================================

      if (p.isPrivate && !m.isPrivate) {
        await m.reply("📩 Perintah ini hanya bisa dipakai di chat pribadi.");
        continue;
      }

      // =================================
      // ENERGY / RESOURCE CHECK
      // =================================

      const energyCost = Number(p.energi || 0);
      let chargedEnergy = 0;

      if (config.features?.energySystem !== false && energyCost > 0 && !m.isOwner) {
        const user = db.getUser(m.sender);
        const currentEnergy = Number(user.energi ?? 0);

        if (currentEnergy !== -1 && currentEnergy < energyCost) {
          await m.reply(`⚡ Energi kamu tidak cukup. Butuh ${energyCost}, tersisa ${currentEnergy}.`);
          continue;
        }

        if (currentEnergy !== -1) {
          db.updateEnergi(m.sender, -energyCost);
          chargedEnergy = energyCost;
        }
      }

      // =================================
      // RUN PLUGIN
      // =================================

      const uptime = Math.floor((Date.now() - startTime) / 1000);

      try {
        await plugin.handler(m, {
          sock,
          config,
          db,
          uptime,
          isOwner: m.isOwner,
          isPremium: m.isPremium,
          isAdmin: m.isAdmin,
          isBotAdmin: m.isBotAdmin,
          isGroup: m.isGroup,
          isPrivate: m.isPrivate,
        });
      } catch (err) {
        if (chargedEnergy > 0) db.updateEnergi(m.sender, chargedEnergy);
        throw err;
      }
    } catch (err) {
      console.error("[messages.upsert] Error:", err);
    }
  }
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  // Watcher aktif supaya perubahan plugin otomatis terdeteksi.
  await loadPlugins({ watch: true });

  db = getDatabase();

  await startConnection({ config, db, onMessages: handleMessages });
}

// ==========================================
// ERROR HANDLER
// ==========================================

process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

// ==========================================
// START
// ==========================================

main().catch((err) => {
  console.error("[Fatal] Failed to start bot:", err);
  process.exit(1);
});