// Compatibility bridge for older plugins that imported ../../appConfig.js.
// Keep the canonical configuration in config.js; this file intentionally re-exports it.
export { default } from "./config.js";
