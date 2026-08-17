import { execSync } from "child_process";
import db from "@/lib/db";

export interface PrinterConfig {
  a4Printer: string;
  thermalPrinter: string;
  defaultPrinter: string;
  paperType: "thermal_58mm" | "thermal_80mm" | "a4";
  autoPrintInvoice: boolean;
}

export class PrinterService {
  /**
   * Detect printers attached to the system (Windows / OS level discovery)
   */
  public getAttachedPrinters(): string[] {
    const printerList: string[] = [];

    try {
      if (process.platform === "win32") {
        // Run powershell to fetch installed printer names
        const command = `powershell -Command "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"`;
        const stdout = execSync(command, { encoding: "utf-8", timeout: 5000 });
        const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

        // Filter out virtual non-printer drivers like Fax & OneNote
        const realPrinters = lines.filter(
          (name) =>
            !name.toLowerCase().includes("fax") &&
            !name.toLowerCase().includes("onenote")
        );

        printerList.push(...realPrinters);
      } else {
        // macOS / Linux lpstat command
        const stdout = execSync("lpstat -e", { encoding: "utf-8", timeout: 5000 });
        const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        printerList.push(...lines);
      }
    } catch (error) {
      console.warn("Could not query system printers via shell:", error);
    }

    // Default fallback if OS returned 0 printers (e.g. shell restricted)
    if (printerList.length === 0) {
      printerList.push("Microsoft Print to PDF");
    }

    return printerList;
  }

  /**
   * Get saved printer configuration from system_settings table
   */
  public getPrinterConfig(): PrinterConfig {
    const stmt = db.prepare<[string], { value: string }>(
      "SELECT value FROM system_settings WHERE key = ?"
    );
    const row = stmt.get("printer_config");

    if (row && row.value) {
      try {
        const parsed = JSON.parse(row.value);
        return {
          a4Printer: parsed.a4Printer || "Microsoft Print to PDF",
          thermalPrinter: parsed.thermalPrinter || parsed.defaultPrinter || "POS-80 Thermal Printer",
          defaultPrinter: parsed.defaultPrinter || parsed.thermalPrinter || "POS-80 Thermal Printer",
          paperType: parsed.paperType || "thermal_80mm",
          autoPrintInvoice: parsed.autoPrintInvoice ?? true,
        };
      } catch {
        // Fallback default
      }
    }

    return {
      a4Printer: "Microsoft Print to PDF",
      thermalPrinter: "POS-80 Thermal Printer",
      defaultPrinter: "POS-80 Thermal Printer",
      paperType: "thermal_80mm",
      autoPrintInvoice: true,
    };
  }

  /**
   * Save printer configuration to system_settings table
   */
  public savePrinterConfig(config: PrinterConfig): PrinterConfig {
    const transaction = db.transaction(() => {
      const jsonValue = JSON.stringify(config);
      const stmt = db.prepare(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('printer_config', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(jsonValue);
      return config;
    });

    return transaction();
  }
}

export const printerService = new PrinterService();
