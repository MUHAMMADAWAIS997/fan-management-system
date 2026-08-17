/**
 * electron/preload.js — Electron Preload Script
 *
 * Runs in the renderer process with access to Node APIs (before contextIsolation).
 * Exposes a minimal, typed API to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require("electron");

console.log("[Electron Preload] Preload script initializing...");

// Relay console logs / errors from Renderer to Main for unified diagnostics
window.addEventListener("error", (event) => {
  console.error(`[Electron Renderer Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[Electron Renderer Unhandled Rejection]", event.reason);
});

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Trigger a full app relaunch (used after database restore).
   */
  restartApp: () => {
    console.log("[Electron Preload] Invoking app:restart");
    return ipcRenderer.invoke("app:restart");
  },

  /**
   * Get the current application version from package.json.
   */
  getAppVersion: () => {
    console.log("[Electron Preload] Invoking app:getVersion");
    return ipcRenderer.invoke("app:getVersion");
  },

  /**
   * Open the native OS folder picker dialog.
   */
  openDirectoryDialog: () => {
    console.log("[Electron Preload] Invoking dialog:openDirectory");
    return ipcRenderer.invoke("dialog:openDirectory");
  },

  /**
   * Current OS platform string ("win32", "darwin", "linux").
   */
  platform: process.platform,

  /**
   * Register a callback for when an app update is available.
   */
  onUpdateAvailable: (callback) => {
    console.log("[Electron Preload] Registering onUpdateAvailable listener");
    ipcRenderer.on("update:available", (_event, info) => callback(info));
  },
});

console.log("[Electron Preload] Preload script successfully loaded. exposed window.electronAPI.");
