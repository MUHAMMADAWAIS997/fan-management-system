import db from "@/lib/db";

export interface InvoiceSettings {
  shopName: string;
  tagline: string;
  phoneNumber: string;
  address: string;
  invoicePrefix: string;
  minStockWarning: number;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  shopName: "WAHID ELECTRONICS",
  tagline: "Authorized Electronics & Fan Retailer",
  phoneNumber: "+92 300 1234567",
  address: "Main Market Road, City Center",
  invoicePrefix: "INV-",
  minStockWarning: 5,
};

export class InvoiceSettingsService {
  /**
   * Fetch current invoice & business customization settings
   */
  public getInvoiceSettings(): InvoiceSettings {
    try {
      const stmt = db.prepare<[string], { value: string }>(
        "SELECT value FROM system_settings WHERE key = ?"
      );
      const row = stmt.get("invoice_settings");

      if (row && row.value) {
        const parsed = JSON.parse(row.value);
        return {
          shopName: parsed.shopName || DEFAULT_INVOICE_SETTINGS.shopName,
          tagline: parsed.tagline || DEFAULT_INVOICE_SETTINGS.tagline,
          phoneNumber: parsed.phoneNumber || DEFAULT_INVOICE_SETTINGS.phoneNumber,
          address: parsed.address || DEFAULT_INVOICE_SETTINGS.address,
          invoicePrefix: parsed.invoicePrefix || DEFAULT_INVOICE_SETTINGS.invoicePrefix,
          minStockWarning: Number(parsed.minStockWarning ?? DEFAULT_INVOICE_SETTINGS.minStockWarning),
        };
      }
    } catch (err) {
      console.warn("Failed to fetch invoice_settings from DB:", err);
    }

    return DEFAULT_INVOICE_SETTINGS;
  }

  /**
   * Save invoice & business customization settings
   */
  public saveInvoiceSettings(settings: Partial<InvoiceSettings>): InvoiceSettings {
    const current = this.getInvoiceSettings();
    const updated: InvoiceSettings = {
      shopName: settings.shopName?.trim() || current.shopName,
      tagline: settings.tagline?.trim() || current.tagline,
      phoneNumber: settings.phoneNumber?.trim() || current.phoneNumber,
      address: settings.address?.trim() || current.address,
      invoicePrefix: settings.invoicePrefix?.trim() || current.invoicePrefix,
      minStockWarning: Number(settings.minStockWarning ?? current.minStockWarning),
    };

    const transaction = db.transaction(() => {
      const jsonValue = JSON.stringify(updated);
      const stmt = db.prepare(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('invoice_settings', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(jsonValue);
      return updated;
    });

    return transaction();
  }

  /**
   * Generate next invoice number based on prefix, date, and incrementing daily count
   * Format: PREFIX + YYYYMMDD + -0001 (e.g. INV-20260803-0001)
   */
  public generateNextInvoiceNumber(dateOverride?: string): string {
    const settings = this.getInvoiceSettings();
    const rawPrefix = settings.invoicePrefix || "INV-";
    const prefix = rawPrefix.endsWith("-") || rawPrefix.endsWith("_") ? rawPrefix : `${rawPrefix}-`;

    const targetDate = dateOverride ? new Date(dateOverride) : new Date();
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;
    const formattedSaleDate = dateOverride || `${year}-${month}-${day}`;

    // Get count of sales created today
    const stmt = db.prepare<[string], { count: number }>(`
      SELECT COUNT(*) as count FROM sales WHERE sale_date = ?
    `);
    const row = stmt.get(formattedSaleDate);
    const count = (row?.count || 0) + 1;
    const countStr = String(count).padStart(4, "0");

    return `${prefix}${dateStr}-${countStr}`;
  }
}

export const invoiceSettingsService = new InvoiceSettingsService();
