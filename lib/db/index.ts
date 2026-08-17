import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

// In a packaged Electron app process.cwd() is read-only (inside ASAR).
// main.js injects ELECTRON_USERDATA so the DB lives in the writable userData dir.
const DB_PATH = process.env.ELECTRON_USERDATA
  ? path.join(process.env.ELECTRON_USERDATA, "fims.db")
  : path.join(process.cwd(), "sqlite.db");

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

function ensureTables(instance: Database.Database) {
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");

  // Create users table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create sessions table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create customers table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create suppliers table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create products table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      size TEXT NOT NULL,
      supplier_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      retail_price REAL NOT NULL DEFAULT 0.0,
      discount REAL NOT NULL DEFAULT 0.0,
      cost REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
    );
  `);

  // Auto-migrate: Add description & status columns if missing on existing databases
  const productCols = instance.pragma("table_info(products)") as { name: string }[];
  if (!productCols.some((col) => col.name === "description")) {
    instance.exec("ALTER TABLE products ADD COLUMN description TEXT;");
  }
  if (!productCols.some((col) => col.name === "status")) {
    instance.exec("ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
    instance.exec("UPDATE products SET status = 'active' WHERE status IS NULL OR status = '';");
  }

  // Create legacy stock table (if not exists)
  instance.exec(`
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      purchase_date TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_retail_price REAL NOT NULL,
      unit_discount_percent REAL NOT NULL DEFAULT 0.0,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      paid_amount REAL NOT NULL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (company_id) REFERENCES suppliers(id) ON DELETE RESTRICT
    );
  `);

  // Create stock_batches (header for multi-item stock purchases) table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS stock_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      purchase_date TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0.0,
      payment_status TEXT NOT NULL DEFAULT 'paid',
      paid_amount REAL NOT NULL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES suppliers(id) ON DELETE RESTRICT
    );
  `);

  // Create stock_items (individual product items inside a stock batch) table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS stock_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_retail_price REAL NOT NULL,
      unit_discount_percent REAL NOT NULL DEFAULT 0.0,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES stock_batches(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  // Create supplier_ledger table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS supplier_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      batch_id INTEGER,
      invoice_number TEXT,
      date TEXT NOT NULL,
      description TEXT,
      debit REAL DEFAULT 0.0,   -- Payment to supplier (reduces balance)
      credit REAL DEFAULT 0.0,  -- Purchase from supplier (increases balance)
      balance REAL DEFAULT 0.0, -- Cumulative balance owed to supplier
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES stock_batches(id) ON DELETE SET NULL
    );
  `);

  // Create expenses table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- 'Stock Purchase', 'Fuel', 'Transport', 'Rent', 'Utilities', 'Salaries', 'Other'
      description TEXT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      reference_id TEXT, -- Invoice # or Receipt #
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create sales (sales header) table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      sale_date TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0.0,
      payment_status TEXT NOT NULL DEFAULT 'paid', -- 'paid', 'partial', 'unpaid'
      paid_amount REAL NOT NULL DEFAULT 0.0,
      shop_name TEXT,
      shop_tagline TEXT,
      shop_phone TEXT,
      shop_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
  `);

  // Auto-migrate: Add shop customization columns to sales table if missing
  const salesCols = instance.pragma("table_info(sales)") as { name: string }[];
  if (!salesCols.some((col) => col.name === "shop_name")) {
    instance.exec("ALTER TABLE sales ADD COLUMN shop_name TEXT;");
  }
  if (!salesCols.some((col) => col.name === "shop_tagline")) {
    instance.exec("ALTER TABLE sales ADD COLUMN shop_tagline TEXT;");
  }
  if (!salesCols.some((col) => col.name === "shop_phone")) {
    instance.exec("ALTER TABLE sales ADD COLUMN shop_phone TEXT;");
  }
  if (!salesCols.some((col) => col.name === "shop_address")) {
    instance.exec("ALTER TABLE sales ADD COLUMN shop_address TEXT;");
  }

  // Create sale_items (line items for a sale) table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_retail_price REAL NOT NULL,
      unit_discount_percent REAL NOT NULL DEFAULT 0.0,
      unit_cost REAL NOT NULL DEFAULT 0.0,
      unit_sale_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    );
  `);

  // Create customer_ledger table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS customer_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      sale_id INTEGER,
      invoice_number TEXT,
      date TEXT NOT NULL,
      description TEXT,
      debit REAL DEFAULT 0.0,   -- Payment received from customer (reduces balance owed)
      credit REAL DEFAULT 0.0,  -- Sale invoice charged to customer (increases balance owed)
      balance REAL DEFAULT 0.0, -- Cumulative balance owed by customer
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
    );
  `);

  // Create system_settings table
  instance.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create B-tree indexes for foreign keys & date columns for high performance
  instance.exec(`
    CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_stock_batches_purchase_date ON stock_batches(purchase_date);
    CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON customer_ledger(date);
    CREATE INDEX IF NOT EXISTS idx_supplier_ledger_date ON supplier_ledger(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_items_batch_id ON stock_items(batch_id);
    CREATE INDEX IF NOT EXISTS idx_stock_items_product_id ON stock_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger(customer_id);
    CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier_id ON supplier_ledger(supplier_id);
  `);

  // Seed default admin user if not existing
  const stmt = instance.prepare("SELECT * FROM users WHERE username = ?");
  const adminUser = stmt.get("admin");

  if (!adminUser) {
    const passwordHash = bcrypt.hashSync("admin1234", 10);
    const insertAdmin = instance.prepare(
      "INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)"
    );
    insertAdmin.run("user_admin_default_id", "admin", passwordHash, "admin");
    console.log("[DB] Default admin user initialized with hashed password.");
  }

  // Auto-migrate: Backfill initial stock records into stock_batches and stock_items for 100% audit tracking
  try {
    const unbatchedProds = instance.prepare(`
      SELECT p.id, p.name, p.supplier_id, p.quantity, p.retail_price, p.discount, p.cost, p.created_at
      FROM products p
    `).all() as any[];

    for (const p of unbatchedProds) {
      const sumRow = instance.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as batched_qty
        FROM stock_items
        WHERE product_id = ?
      `).get(p.id) as { batched_qty: number };

      const unbatchedQty = p.quantity - (sumRow?.batched_qty || 0);

      if (unbatchedQty > 0) {
        const rp = p.retail_price || 0;
        const uCost = p.cost || 0;
        let discPct = 10;
        if (rp > 0 && uCost > 0 && uCost <= rp) {
          discPct = Number((((rp - uCost) / rp) * 100).toFixed(1));
        }

        const totalCost = Number((uCost * unbatchedQty).toFixed(2));
        const purchaseDate = p.created_at ? p.created_at.split("T")[0].split(" ")[0] : "2026-07-30";
        const supplierId = p.supplier_id || 1;

        const batchRes = instance.prepare(`
          INSERT INTO stock_batches (company_id, purchase_date, invoice_number, total_amount, payment_status, paid_amount)
          VALUES (?, ?, ?, ?, 'paid', ?)
        `).run(supplierId, purchaseDate, "INITIAL-STOCK", totalCost, totalCost);

        const batchId = batchRes.lastInsertRowid;

        instance.prepare(`
          INSERT INTO stock_items (batch_id, product_id, quantity, unit_retail_price, unit_discount_percent, unit_cost, total_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(batchId, p.id, unbatchedQty, rp, discPct, uCost, totalCost);
      }
    }
  } catch (err) {
    console.error("[DB Migration] Error backfilling initial stock:", err);
  }
}

function initDb(): Database.Database {
  const instance = globalForDb.db ?? new Database(DB_PATH);
  instance.pragma("foreign_keys = ON");
  instance.pragma("journal_mode = WAL");
  ensureTables(instance);
  return instance;
}

export const db: Database.Database = initDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export default db;
