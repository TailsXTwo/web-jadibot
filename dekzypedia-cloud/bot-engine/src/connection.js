import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} from "@itsliaaa/baileys";

import { Boom } from "@hapi/boom";
import pino from "pino";
import readline from "readline";

import { startAutoBackup } from "./lib/autoBackup.js";
import { registerGroupEvents } from "./lib/groupGuard.js";
import { autoFollowChannels } from "./lib/autoFollowChannel.js";

const logger = pino({ level: "silent" });

// ==========================================
// PLACEHOLDER NOMOR
// ==========================================

const PLACEHOLDER_NUMBERS = new Set([
  "628xxxxxxxxxx",
  "6285805575583",
]);

// ==========================================
// RECONNECT
// ==========================================

const MAX_BACKOFF_MS = 30_000;

let generationId = 0;
let reconnectAttempts = 0;

function getBackoffDelay() {
  const ms = Math.min(
    2000 * 2 ** reconnectAttempts,
    MAX_BACKOFF_MS
  );

  reconnectAttempts++;

  return ms;
}

const delayMs = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// INPUT NOMOR PAIRING
// ==========================================

function askInput(promptText, timeoutMs = 60_000) {
  if (!process.stdin.isTTY) {
    console.log("\n⚠️ Tidak bisa minta input nomor secara interaktif.");
    console.log(
      "Isi config.botNumber di config.js dengan format 628xxxxxxxxxx"
    );

    return Promise.resolve("");
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      rl.close();

      console.log("\n⚠️ Tidak ada input diterima dalam 60 detik.");

      resolve("");
    }, timeoutMs);

    rl.question(promptText, (answer) => {
      clearTimeout(timer);
      rl.close();

      resolve(answer);
    });
  });
}

// ==========================================
// RESOLVE NOMOR PAIRING
// ==========================================

async function resolvePairingNumber(config) {
  const normalize = (v) =>
    String(v || "").replace(/[^0-9]/g, "");

  let pn = normalize(config.botNumber);

  if (pn && PLACEHOLDER_NUMBERS.has(config.botNumber)) {
    console.log(
      "\n⚠️ config.botNumber masih nomor CONTOH dari template."
    );

    pn = "";
  }

  if (!pn) {
    const raw = await askInput(
      "Masukkan nomor WhatsApp bot (format: 628xxxxxxxxxx): "
    );

    pn = normalize(raw);
  }

  if (pn.startsWith("0")) {
    const fixed = "62" + pn.slice(1);

    console.log(
      `\n⚠️ Nomor "${pn}" dipakai sebagai "${fixed}".`
    );

    pn = fixed;
  }

  return pn;
}

// ==========================================
// REQUEST PAIRING CODE
// ==========================================

async function requestPairingCodeWithRetry(
  sock,
  pn,
  myGeneration,
  maxAttempts = 3
) {
  const isStale = () => myGeneration !== generationId;

  if (!pn || pn.length < 8 || pn.length > 15) {
    console.log("\n❌ Nomor WhatsApp tidak valid.");

    return;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (isStale()) return;

    try {
      await delayMs(attempt === 1 ? 3000 : 2000);

      if (isStale()) return;

      const code = await sock.requestPairingCode(pn);

      if (isStale()) return;

      const formatted =
        code?.match(/.{1,4}/g)?.join("-") || code;

      console.log(
        "\n┌───────────────────────────────┐"
      );

      console.log(
        "│      📩 PAIRING CODE SIAP      │"
      );

      console.log(
        "└───────────────────────────────┘"
      );

      console.log(`   ${formatted}\n`);

      console.log(
        "Buka WhatsApp > Perangkat Tertaut >"
      );

      console.log(
        "Tautkan dengan nomor telepon."
      );

      return;
    } catch (err) {
      if (isStale()) return;

      console.log(
        `❌ Gagal ambil pairing code (${attempt}/${maxAttempts}):`,
        err?.message || err
      );

      if (attempt >= maxAttempts) {
        console.log("\nPairing gagal terus.");
      }
    }
  }
}

// ==========================================
// START CONNECTION
// ==========================================

/**
 * Membuat (atau membuat ulang, saat reconnect) socket Baileys.
 *
 * @param {object} opts
 * @param {object} opts.config - config.js
 * @param {object} opts.db - instance database (dari getDatabase())
 * @param {(sock: object, payload: { messages: any[], type: string }) => Promise<void>} opts.onMessages
 *   dipanggil setiap event "messages.upsert" — logic dispatch command tetap di index.js.
 * @returns {Promise<import("@itsliaaa/baileys").WASocket|undefined>}
 */

async function startConnection({
  config,
  db,
  onMessages,
}) {
  const myGeneration = ++generationId;

  // ========================================
  // AUTH STATE
  // ========================================

  const {
    state,
    saveCreds,
  } = await useMultiFileAuthState(
    "./database/session"
  );

  if (myGeneration !== generationId) return;

  // ========================================
  // PAIRING
  // ========================================

  const usePairingCode =
    config.usePairingCode !== false;

  const sock = makeWASocket({
    logger,
    printQRInTerminal: !usePairingCode,
    auth: state,
    browser: [
      "Ubuntu",
      "Chrome",
      "120.0.0.0",
    ],
    generateHighQualityLinkPreview: true,
  });

  // ========================================
  // REQUEST PAIRING
  // ========================================

  if (
    usePairingCode &&
    !sock.authState.creds.registered
  ) {
    (async () => {
      const pn =
        await resolvePairingNumber(config);

      if (myGeneration !== generationId) return;

      await requestPairingCodeWithRetry(
        sock,
        pn,
        myGeneration
      );
    })();
  }

  // ========================================
  // CREDS UPDATE
  // ========================================

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  // ========================================
  // CONNECTION
  // ========================================

  sock.ev.on(
    "connection.update",
    (update) => {
      const {
        connection,
        lastDisconnect,
        qr,
      } = update;

      if (myGeneration !== generationId) return;

      if (qr && !usePairingCode) {
        console.log(
          "\n[Auth] Scan QR menggunakan WhatsApp.\n"
        );
      }

      // ================================
      // CONNECTION CLOSED
      // ================================

      if (connection === "close") {
        const statusCode =
          new Boom(lastDisconnect?.error)
            ?.output?.statusCode ??
          lastDisconnect?.error
            ?.output?.statusCode;

        // ================================
        // LOGGED OUT
        // ================================

        if (
          statusCode ===
          DisconnectReason.loggedOut
        ) {
          console.log(
            "[Connection] Logged out."
          );

          console.log(
            "Hapus folder ./database/session lalu jalankan ulang."
          );

          process.exit(0);
        }

        // ================================
        // CONNECTION REPLACED
        // ================================

        if (
          statusCode ===
          DisconnectReason.connectionReplaced
        ) {
          console.log(
            "\n❌ Koneksi diambil alih instance bot lain."
          );

          process.exit(1);
        }

        // ================================
        // RECONNECT
        // ================================

        const isRestartRequired =
          statusCode ===
          DisconnectReason.restartRequired;

        const wait =
          isRestartRequired
            ? 0
            : getBackoffDelay();

        console.log(
          `[Connection] Closed (${statusCode ?? "unknown"}). Reconnecting in ${Math.round(
            wait / 1000
          )}s...`
        );

        sock.ev.removeAllListeners();

        setTimeout(() => {
          startConnection({
            config,
            db,
            onMessages,
          }).catch((err) =>
            console.error(
              "[Reconnect] Failed:",
              err
            )
          );
        }, wait);

      } else if (connection === "open") {
        reconnectAttempts = 0;

        console.log(
          `[Connection] Connected as ${sock.user?.id}`
        );

        startAutoBackup(
          sock,
          config,
          db
        );

        

        autoFollowChannels(sock).catch(() => {});
      }
    }
  );

  // ==========================================
  // GROUP EVENTS
  // ==========================================

  registerGroupEvents(
    sock,
    db
  );

  // ==========================================
  // MESSAGE HANDLER
  // ==========================================

  sock.ev.on(
    "messages.upsert",
    async ({ messages, type }) => {
      await onMessages(
        sock,
        {
          messages,
          type,
        }
      );
    }
  );

  return sock;
}

export {
  startConnection,
};