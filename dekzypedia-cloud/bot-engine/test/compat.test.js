import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlugin } from "../src/lib/featureRuntime.js";
import { getDatabase } from "../src/lib/database.js";

test("plugin metadata normalizes name arrays and aliases", () => {
  const plugin = normalizePlugin({
    config: { name: ["ht", "hidetag"], alias: "mention" },
    handler() {},
  });

  assert.equal(plugin.config.name, "ht");
  assert.deepEqual(plugin.config.alias, ["mention", "hidetag"]);
});

test("database supports modern and legacy APIs", () => {
  const db = getDatabase();
  const jid = "629991112223@s.whatsapp.net";

  db.setUser(jid, { koin: 10, energi: 20, exp: 1 });
  assert.equal(db.updateKoin(jid, 5), 15);
  assert.equal(db.updateEnergi(jid, -3), 17);
  assert.equal(db.updateExp(jid, 9), 10);
  assert.equal(db.db.data.users["629991112223"].koin, 15);
  assert.equal(typeof db.save, "function");
  assert.equal(typeof db.db.write, "function");

  db.setting("__compat_test__", true);
  assert.equal(db.setting("__compat_test__"), true);
});
