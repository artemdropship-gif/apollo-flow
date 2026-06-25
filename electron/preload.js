// Minimal, locked-down preload. Apollo-Flow runs as a normal web app inside the
// window; no Node APIs are exposed to the page. Kept as an explicit, auditable
// boundary (contextIsolation is on, nodeIntegration is off in main.js).
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("apolloDesktop", {
  isDesktop: true,
});
