/**
 * electron/ipc.js — IPC Handler Registry
 *
 * Exports a function that receives (ipcMain, app) from main.js
 * and registers all IPC handlers with explicit diagnostic logging.
 */

const { dialog } = require("electron");

/**
 * @param {import("electron").IpcMain} ipcMain
 * @param {import("electron").App} app
 */
module.exports = function registerIpcHandlers(ipcMain, app) {
  console.log("[Electron Main:IPC] Initializing IPC handler registration...");

  // ── app:restart ───────────────────────────────────────────────────────────
  ipcMain.handle("app:restart", () => {
    console.log("[Electron Main:IPC] Handler 'app:restart' triggered — relaunching application.");
    app.relaunch();
    app.exit(0);
  });

  // ── app:getVersion ────────────────────────────────────────────────────────
  ipcMain.handle("app:getVersion", () => {
    const version = app.getVersion();
    console.log(`[Electron Main:IPC] Handler 'app:getVersion' triggered — returning version ${version}`);
    return version;
  });

  // ── dialog:openDirectory ─────────────────────────────────────────────────
  ipcMain.handle("dialog:openDirectory", async (event) => {
    console.log("[Electron Main:IPC] Handler 'dialog:openDirectory' triggered — opening native directory dialog.");
    const { BrowserWindow } = require("electron");
    const win = BrowserWindow.fromWebContents(event.sender);

    const result = await dialog.showOpenDialog(win, {
      title: "Select Backup Folder",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      console.log("[Electron Main:IPC] Directory dialog canceled by user.");
      return null;
    }

    console.log(`[Electron Main:IPC] Directory selected: ${result.filePaths[0]}`);
    return result.filePaths[0];
  });

  console.log("[Electron Main:IPC] All IPC handlers successfully registered.");
};
