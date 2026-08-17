import fs from "fs";
import path from "path";
import os from "os";
import Database from "better-sqlite3";
import db from "@/lib/db";

export interface BackupFileInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  fullPath: string;
  isValid?: boolean;
}

export class BackupService {
  /**
   * Get default suggested backup folder path (%APPDATA%/FIMS/backups or Documents/FIMS_Backups)
   */
  public getDefaultBackupDir(): string {
    // In Electron mode, use the writable userData directory injected by main.js
    if (process.env.ELECTRON_USERDATA) {
      return path.join(process.env.ELECTRON_USERDATA, "backups");
    }
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "FIMS", "backups");
  }

  /**
   * Check if a custom backup directory has been configured by the admin
   */
  public isBackupDirConfigured(): boolean {
    const stmt = db.prepare<[string], { value: string }>(
      "SELECT value FROM system_settings WHERE key = ?"
    );
    const row = stmt.get("backup_dir_path");
    return Boolean(row && row.value && row.value.trim().length > 0);
  }

  /**
   * Get active backup directory path (custom if set, otherwise default suggested)
   */
  public getBackupDir(): string {
    const stmt = db.prepare<[string], { value: string }>(
      "SELECT value FROM system_settings WHERE key = ?"
    );
    const row = stmt.get("backup_dir_path");

    let dir = row && row.value ? row.value.trim() : this.getDefaultBackupDir();

    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn(`Failed to create directory ${dir}, falling back to default`, err);
        dir = this.getDefaultBackupDir();
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
    }
    return dir;
  }

  /**
   * Set and save a new custom backup directory path
   */
  public setBackupDir(newPath: string): string {
    if (!newPath || !newPath.trim()) {
      throw new Error("Backup folder path cannot be empty.");
    }

    const trimmedPath = newPath.trim();

    // Ensure target folder exists or can be created
    if (!fs.existsSync(trimmedPath)) {
      fs.mkdirSync(trimmedPath, { recursive: true });
    }

    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('backup_dir_path', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(trimmedPath);
    });

    transaction();
    return trimmedPath;
  }

  /**
   * Validate SQLite database backup file integrity (magic header, PRAGMA check & schema verification)
   */
  public validateBackupFile(filePath: string): { isValid: boolean; reason?: string } {
    if (!fs.existsSync(filePath)) {
      return { isValid: false, reason: "Backup file does not exist." };
    }

    const stats = fs.statSync(filePath);
    if (stats.size < 100) {
      return { isValid: false, reason: "Backup file is empty or corrupted (size < 100 bytes)." };
    }

    // 1. Verify 16-byte SQLite header magic bytes
    try {
      const fd = fs.openSync(filePath, "r");
      const buffer = Buffer.alloc(16);
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);
      const headerStr = buffer.toString("utf-8");
      if (!headerStr.startsWith("SQLite format 3")) {
        return { isValid: false, reason: "File is not a valid SQLite database (invalid header)." };
      }
    } catch {
      return { isValid: false, reason: "Could not read database file header." };
    }

    // 2. Open temporary sqlite connection and run PRAGMA quick_check
    let tempDb: Database.Database | null = null;
    try {
      tempDb = new Database(filePath, { readonly: true, fileMustExist: true });
      const checkRow = tempDb.pragma("quick_check") as { quick_check: string }[];
      if (!checkRow || checkRow.length === 0 || checkRow[0].quick_check !== "ok") {
        return { isValid: false, reason: "Database integrity check failed (corrupted pages)." };
      }

      // 3. Verify presence of required schema tables
      const tables = tempDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);

      const requiredTables = ["users", "products", "sales", "customers", "suppliers"];
      const missing = requiredTables.filter((t) => !tableNames.includes(t));
      if (missing.length > 0) {
        return {
          isValid: false,
          reason: `Database missing required application tables: ${missing.join(", ")}.`,
        };
      }
    } catch (err: any) {
      return { isValid: false, reason: err?.message || "Failed to parse database schema." };
    } finally {
      if (tempDb) {
        tempDb.close();
      }
    }

    return { isValid: true };
  }

  /**
   * Automatically delete backup files older than retentionDays (default 10 days)
   */
  public cleanupOldBackups(retentionDays: number = 10): { deletedCount: number; deletedFiles: string[] } {
    const dir = this.getBackupDir();
    if (!fs.existsSync(dir)) return { deletedCount: 0, deletedFiles: [] };

    const files = fs.readdirSync(dir);
    const dbFiles = files.filter((f) => f.endsWith(".db"));

    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
    const deletedFiles: string[] = [];

    for (const file of dbFiles) {
      const filePath = path.join(dir, file);
      try {
        const stats = fs.statSync(filePath);
        const fileAgeMs = now - Math.max(stats.mtimeMs, stats.birthtimeMs);
        if (fileAgeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedFiles.push(file);
          console.log(`[BackupService] Auto-removed old backup file (>10 days old): ${file}`);
        }
      } catch (err) {
        console.warn(`[BackupService] Failed to check/delete backup file ${file}:`, err);
      }
    }

    return { deletedCount: deletedFiles.length, deletedFiles };
  }

  /**
   * Create a timestamped SQLite DB backup locally in active backup folder
   */
  public async createBackup(): Promise<BackupFileInfo> {
    const dir = this.getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `fims_backup_${timestamp}.db`;
    const destPath = path.join(dir, filename);

    // Use better-sqlite3 db.backup() for zero-corruption hot backup
    await db.backup(destPath);

    // Auto-clean backups older than 10 days
    this.cleanupOldBackups(10);

    const stats = fs.statSync(destPath);
    return {
      filename,
      sizeBytes: stats.size,
      createdAt: stats.birthtime.toISOString(),
      fullPath: destPath,
      isValid: true,
    };
  }

  /**
   * Perform automatic database backup and clean up backups older than 10 days
   */
  public async performAutoBackup(): Promise<BackupFileInfo | null> {
    const dir = this.getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const autoFilename = `fims_autobackup_${timestamp}.db`;
    const destPath = path.join(dir, autoFilename);

    await db.backup(destPath);

    // Auto-clean backups older than 10 days
    this.cleanupOldBackups(10);

    const stats = fs.statSync(destPath);
    return {
      filename: autoFilename,
      sizeBytes: stats.size,
      createdAt: stats.birthtime.toISOString(),
      fullPath: destPath,
      isValid: true,
    };
  }

  /**
   * List all available local backup files in active backup folder with integrity status
   */
  public listBackups(): BackupFileInfo[] {
    const dir = this.getBackupDir();
    if (!fs.existsSync(dir)) return [];

    // Automatically remove backups older than 10 days on listing/start
    this.cleanupOldBackups(10);

    const files = fs.readdirSync(dir);
    const dbFiles = files.filter((f) => f.endsWith(".db"));

    return dbFiles
      .map((f) => {
        const fullPath = path.join(dir, f);
        const stats = fs.statSync(fullPath);
        const val = this.validateBackupFile(fullPath);
        return {
          filename: f,
          sizeBytes: stats.size,
          createdAt: stats.birthtime.toISOString(),
          fullPath,
          isValid: val.isValid,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Restore database from a chosen backup file with validation & safety pre-restore snapshot
   */
  public async restoreBackup(filename: string): Promise<boolean> {
    const dir = this.getBackupDir();
    const sourcePath = path.join(dir, filename);

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Backup file "${filename}" not found in local backup directory.`);
    }

    // 1. Validate backup file integrity
    const validation = this.validateBackupFile(sourcePath);
    if (!validation.isValid) {
      throw new Error(`Cannot restore backup: ${validation.reason || "Invalid database file."}`);
    }

    // 2. Create pre-restore safety snapshot of active DB before overwriting
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapshotPath = path.join(dir, `fims_prerestore_snapshot_${timestamp}.db`);
    await db.backup(snapshotPath);

    // 3. Determine the active DB path (mirrors lib/db/index.ts resolution)
    const currentDbPath = process.env.ELECTRON_USERDATA
      ? path.join(process.env.ELECTRON_USERDATA, "fims.db")
      : path.join(process.cwd(), "sqlite.db");

    // 4. Close DB connection and overwrite with restored file
    db.close();
    fs.copyFileSync(sourcePath, currentDbPath);

    // 5. In Electron mode the DB connection is now permanently closed for this
    //    process lifetime. Signal the renderer to relaunch the app via IPC.
    //    The caller (restoreBackupAction) should check this flag and call
    //    window.electronAPI?.restartApp() on the client side.
    if (process.env.ELECTRON_APP === "true") {
      throw Object.assign(new Error("RESTART_REQUIRED"), { restartRequired: true });
    }

    return true;
  }
}

export const backupService = new BackupService();
