/**
 * electron/main.js — Electron Main Process
 *
 * Diagnostic-Enhanced Standalone Architecture:
 * - Logs all startup steps, process modes, path resolutions, server readiness,
 *   BrowserWindow creation, navigation events, IPC registrations, and crash events.
 */

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, fork } = require("child_process");

// ─── Global Error & Crash Diagnostics ─────────────────────────────────────────
process.on("uncaughtException", (error) => {
  console.error("[Electron Main] CRITICAL Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Electron Main] CRITICAL Unhandled Promise Rejection:", reason);
});

console.log("[Electron Main] Startup sequence initiated.");

// ─── Mode & Path Resolution ──────────────────────────────────────────────────
const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
const NEXT_PORT = process.env.PORT || 3000;
const NEXT_HOST = "127.0.0.1";
const NEXT_URL = `http://${NEXT_HOST}:${NEXT_PORT}`;

console.log(`[Electron Main] Environment: ${isDev ? "DEVELOPMENT" : "PRODUCTION"}`);
console.log(`[Electron Main] app.isPackaged: ${app.isPackaged}`);
console.log(`[Electron Main] process.execPath: ${process.execPath}`);
console.log(`[Electron Main] __dirname: ${__dirname}`);
console.log(`[Electron Main] Target URL: ${NEXT_URL}`);

// Single Instance Lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.log("[Electron Main] Another instance is already running. Exiting process.");
  app.quit();
  process.exit(0);
}

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {import("child_process").ChildProcess | null} */
let nextProcess = null;

// Register IPC handlers
require("./ipc")(ipcMain, app);

// ─── Utility: Wait for Next.js HTTP server readiness ──────────────────────────
function waitForNextJs(url, retries = 40, interval = 1000) {
  console.log(`[Electron Main] Probing Next.js server readiness at ${url} (Max retries: ${retries})...`);
  return new Promise((resolve, reject) => {
    const http = require("http");
    let attempts = 0;

    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        if (res.statusCode < 500) {
          console.log(`[Electron Main] Next.js server responded on attempt ${attempts}/${retries} with status ${res.statusCode}`);
          resolve();
        } else {
          retry(`Server returned HTTP status code ${res.statusCode}`);
        }
      });

      req.on("error", (err) => {
        retry(err.message);
      });

      req.end();
    };

    const retry = (reason) => {
      if (attempts >= retries) {
        reject(new Error(`Next.js server not ready after ${retries} attempts (${retries * interval / 1000}s). Last error: ${reason}`));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

// ─── Start Next.js Server ────────────────────────────────────────────────────
function startNextServer() {
  if (process.env.ELECTRON_SKIP_NEXT_SERVER === "true") {
    console.log("[Electron Main] Skipping internal Next.js server start (ELECTRON_SKIP_NEXT_SERVER=true)");
    return;
  }

  const userData = app.getPath("userData");
  console.log(`[Electron Main] Resolved ELECTRON_USERDATA: ${userData}`);

  if (isDev) {
    const projectRoot = path.join(__dirname, "..");
    console.log(`[Electron Main] Development mode project root: ${projectRoot}`);

    const env = {
      ...process.env,
      ELECTRON_APP: "true",
      ELECTRON_USERDATA: userData,
      NODE_ENV: "development",
      PORT: String(NEXT_PORT),
    };

    const isWin = process.platform === "win32";
    const nextBin = path.join(
      projectRoot,
      "node_modules",
      ".bin",
      isWin ? "next.cmd" : "next"
    );

    console.log(`[Electron Main] Spawning dev server binary: ${nextBin}`);
    nextProcess = spawn(nextBin, ["dev"], {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      shell: isWin,
    });
  } else {
    // Production Standalone Server Mode
    const standaloneDir = app.isPackaged
      ? path.join(process.resourcesPath, "standalone")
      : path.join(__dirname, "..", ".next", "standalone");
    const serverJsPath = path.join(standaloneDir, "server.js");

    console.log(`[Electron Main] Resolved standalone directory: ${standaloneDir}`);
    console.log(`[Electron Main] Resolved server entry script: ${serverJsPath}`);

    if (!fs.existsSync(serverJsPath)) {
      console.error(`[Electron Main] CRITICAL ERROR: Next.js standalone server script missing at ${serverJsPath}`);
      return;
    }

    const staticDir = path.join(standaloneDir, ".next", "static");
    const publicDir = path.join(standaloneDir, "public");
    console.log(`[Electron Main] Standalone assets status — .next/static: ${fs.existsSync(staticDir)}, public: ${fs.existsSync(publicDir)}`);

    const env = {
      ...process.env,
      ELECTRON_APP: "true",
      ELECTRON_USERDATA: userData,
      NODE_ENV: "production",
      PORT: String(NEXT_PORT),
      HOSTNAME: NEXT_HOST,
    };

    console.log(`[Electron Main] Forking standalone server via child_process.fork: ${serverJsPath}...`);
    nextProcess = fork(serverJsPath, [], {
      cwd: standaloneDir,
      env,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });

    if (nextProcess.stdout) {
      nextProcess.stdout.on("data", (data) => {
        console.log(`[Next.js Server Output] ${data.toString().trim()}`);
      });
    }

    if (nextProcess.stderr) {
      nextProcess.stderr.on("data", (data) => {
        console.error(`[Next.js Server Error] ${data.toString().trim()}`);
      });
    }
  }

  if (nextProcess) {
    console.log(`[Electron Main] Next.js child process spawned with PID: ${nextProcess.pid}`);

    nextProcess.on("error", (err) => {
      console.error("[Electron Main] Failed to spawn Next.js process:", err);
    });

    nextProcess.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`[Electron Main] Next.js process exited unexpectedly with code ${code}, signal: ${signal}`);
      } else {
        console.log(`[Electron Main] Next.js process exited gracefully.`);
      }
    });
  }
}

// ─── Display Startup Error Page ───────────────────────────────────────────────
function showErrorPage(win, errorDetails) {
  console.log("[Electron Main] Rendering startup failure error page in BrowserWindow...");
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Startup Error — FIMS</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 2rem; box-sizing: border-box; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2.5rem; max-width: 650px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        h2 { color: #f87171; margin-top: 0; font-size: 1.5rem; }
        p { color: #94a3b8; line-height: 1.6; }
        pre { background: #090d16; padding: 1rem; border-radius: 8px; font-size: 0.85rem; color: #fca5a5; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
        button { background: #0284c7; color: white; border: none; padding: 0.75rem 1.5rem; font-size: 1rem; font-weight: 600; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #0369a1; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Application Startup Failed</h2>
        <p>The FIMS application server failed to initialize.</p>
        <pre>${errorDetails}</pre>
        <div style="margin-top: 1.5rem;">
          <button onclick="window.electronAPI ? window.electronAPI.restartApp() : location.reload()">Relaunch Application</button>
        </div>
      </div>
    </body>
    </html>
  `;
  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.show();
}

// ─── Create BrowserWindow ─────────────────────────────────────────────────────
function createWindow() {
  console.log("[Electron Main] Creating BrowserWindow instance...");
  const iconFilename = fs.existsSync(path.join(__dirname, "..", "public", "icon.ico")) ? "icon.ico" : "favicon.ico";
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "standalone", "public", iconFilename)
    : path.join(__dirname, "..", "public", iconFilename);
  const preloadPath = path.join(__dirname, "preload.js");

  console.log(`[Electron Main] Resolved preload script path: ${preloadPath}`);
  console.log(`[Electron Main] Resolved app icon path: ${iconPath} (Exists: ${fs.existsSync(iconPath)})`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "FIMS — Fan Inventory & Sales Management",
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    backgroundColor: "#0f172a",
  });

  // BrowserWindow WebContents LifeCycle & Error Logging
  const wc = mainWindow.webContents;

  wc.on("did-start-loading", () => {
    console.log("[Electron Main:WebContents] Page started loading...");
  });

  wc.on("did-finish-load", () => {
    console.log("[Electron Main:WebContents] Page finished loading successfully.");
  });

  wc.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Electron Main:WebContents] Page failed to load URL ${validatedURL}. Code: ${errorCode}, Error: ${errorDescription}`);
  });

  wc.on("render-process-gone", (_event, details) => {
    console.error(`[Electron Renderer Crash] Render process gone! Reason: ${details.reason}, Exit Code: ${details.exitCode}`);
  });

  wc.on("child-process-gone", (_event, details) => {
    console.error(`[Electron Main] Child process gone! Name: ${details.name}, Reason: ${details.reason}, Exit Code: ${details.exitCode}`);
  });

  wc.on("plugin-crashed", (_event, name, version) => {
    console.error(`[Electron Main] Plugin crashed: ${name} (v${version})`);
  });

  // Open external links in native browser
  wc.setWindowOpenHandler(({ url }) => {
    console.log(`[Electron Main:Navigation] External URL request: ${url}`);
    if (!url.startsWith(NEXT_URL) && !url.startsWith(`http://localhost:${NEXT_PORT}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    console.log("[Electron Main] BrowserWindow closed.");
    mainWindow = null;
  });

  return mainWindow;
}

// ─── Auto Backup & Retention Management ─────────────────────────────────────
/**
 * Automatically delete backup files older than retentionDays (10 days)
 */
function cleanupOldBackupsInDir(dirPath, retentionDays = 10) {
  try {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    const dbFiles = files.filter((f) => f.endsWith(".db"));

    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of dbFiles) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        const fileAgeMs = now - Math.max(stats.mtimeMs, stats.birthtimeMs);
        if (fileAgeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`[Electron Main:Backup] Auto-removed backup file older than ${retentionDays} days: ${file}`);
        }
      } catch (e) {
        console.warn(`[Electron Main:Backup] Failed to check/delete ${file}:`, e);
      }
    }
    if (deletedCount > 0) {
      console.log(`[Electron Main:Backup] Cleaned up ${deletedCount} backup files older than ${retentionDays} days.`);
    }
  } catch (err) {
    console.error("[Electron Main:Backup] Failed during old backups cleanup:", err);
  }
}

let isBackupExecutedOnClose = false;

function getDefaultBackupDir() {
  const os = require("os");
  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, "FIMS", "backups");
}

/**
 * Perform auto-backup on software close and clean up backups older than 10 days
 */
function handleCloseBackupAndCleanup() {
  if (isBackupExecutedOnClose) return;
  isBackupExecutedOnClose = true;

  try {
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "fims.db");
    const fallbackDbPath = path.join(process.cwd(), "sqlite.db");
    const activeDbPath = fs.existsSync(dbPath) ? dbPath : fs.existsSync(fallbackDbPath) ? fallbackDbPath : null;

    if (!activeDbPath) {
      console.log("[Electron Main:Backup] No active database found for backup on close.");
      return;
    }

    const Database = require("better-sqlite3");
    let targetDir = getDefaultBackupDir();

    // Query custom backup directory from system_settings if configured
    try {
      const tempDb = new Database(activeDbPath, { readonly: true });
      const row = tempDb.prepare("SELECT value FROM system_settings WHERE key = 'backup_dir_path'").get();
      tempDb.close();
      if (row && row.value && row.value.trim().length > 0) {
        targetDir = row.value.trim();
      }
    } catch (e) {
      console.warn("[Electron Main:Backup] Could not query system_settings:", e);
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Create Timestamped Auto Backup File
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const autoFilename = `fims_autobackup_${timestamp}.db`;
    const destPath = path.join(targetDir, autoFilename);

    console.log(`[Electron Main:Backup] Creating auto-backup on app close: ${destPath}`);
    const activeDb = new Database(activeDbPath);
    activeDb.backup(destPath);
    activeDb.close();
    console.log(`[Electron Main:Backup] Auto-backup created successfully on software exit: ${autoFilename}`);

    // 2. Clean up backups older than 10 days
    cleanupOldBackupsInDir(targetDir, 10);
  } catch (err) {
    console.error("[Electron Main:Backup] Failed to execute auto-backup on close:", err);
  }
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  console.log(`[Electron Main] app.whenReady() fired. Electron version: ${process.versions.electron}, Node version: ${process.versions.node}`);

  // Auto-clean backups older than 10 days on system start
  cleanupOldBackupsInDir(getDefaultBackupDir(), 10);

  // 1. Start internal Next.js server
  startNextServer();

  // 2. Create window instance (hidden)
  const win = createWindow();

  // 3. Wait for Next.js HTTP server to report healthy
  try {
    console.log(`[Electron Main] Awaiting Next.js server readiness at ${NEXT_URL}...`);
    await waitForNextJs(NEXT_URL, 40, 1000);
    console.log("[Electron Main] Next.js server is confirmed READY.");

    console.log(`[Electron Main] Loading URL into BrowserWindow: ${NEXT_URL}`);
    await win.loadURL(NEXT_URL);
    console.log("[Electron Main] Displaying BrowserWindow.");
    win.show();

    if (isDev) {
      console.log("[Electron Main] Opening DevTools (detach mode)...");
      win.webContents.openDevTools({ mode: "detach" });
    }
  } catch (err) {
    console.error("[Electron Main] Startup Failure:", err.message);
    showErrorPage(win, err.message);
  }
});

// Focus existing window on second instance launch
app.on("second-instance", () => {
  console.log("[Electron Main] Second instance launch attempted. Focusing existing window.");
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  console.log("[Electron Main] Event: window-all-closed");
  handleCloseBackupAndCleanup();
  if (process.platform !== "darwin") {
    if (nextProcess) {
      console.log("[Electron Main] Killing Next.js child process on window-all-closed...");
      nextProcess.kill();
    }
    app.quit();
  }
});

// macOS — re-create window if dock icon clicked
app.on("activate", () => {
  console.log("[Electron Main] Event: activate");
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Terminate Next.js child process on exit & perform auto-backup
app.on("before-quit", () => {
  console.log("[Electron Main] Event: before-quit — performing auto-backup and terminating Next.js child process...");
  handleCloseBackupAndCleanup();
  if (nextProcess) {
    nextProcess.kill("SIGTERM");
    nextProcess = null;
  }
});
