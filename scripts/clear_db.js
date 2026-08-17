const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(process.cwd(), "sqlite.db");
const db = new Database(DB_PATH);

console.log("[DB CLEANUP] Disabling foreign key constraints temporarily...");
db.pragma("foreign_keys = OFF");

const tablesToClear = [
  "sale_items",
  "sales",
  "customer_ledger",
  "stock_items",
  "stock_batches",
  "supplier_ledger",
  "expenses",
  "stock",
  "products",
  "customers",
  "suppliers",
  "system_settings",
];

db.transaction(() => {
  for (const table of tablesToClear) {
    try {
      db.prepare(`DELETE FROM ${table}`).run();
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = '${table}'`).run();
      console.log(`[DB CLEANUP] Cleared table: ${table}`);
    } catch (err) {
      console.warn(`[DB CLEANUP] Note for table ${table}: ${err.message}`);
    }
  }
})();

db.pragma("foreign_keys = ON");
console.log("[DB CLEANUP] Re-enabled foreign key constraints.");

const userCount = db.prepare("SELECT count(*) as count FROM users").get().count;
console.log(`[DB CLEANUP] SUCCESS! All data tables cleared. Preserved ${userCount} admin user account(s).`);
db.close();
