const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(process.cwd(), "sqlite.db");
const db = new Database(DB_PATH);

console.log("[UPDATE DESCRIPTION] Starting description cleanup...");

db.transaction(() => {
  const products = db.prepare("SELECT id, description FROM products WHERE description LIKE '%Yellow Listed Item%'").all();
  let updatedCount = 0;

  const updateStmt = db.prepare("UPDATE products SET description = ? WHERE id = ?");

  for (const prod of products) {
    if (prod.description) {
      const cleaned = prod.description
        .replace(/ - PAK FANS Yellow Listed Item/g, "")
        .replace(/ Yellow Listed Item/g, "")
        .trim();
      
      updateStmt.run(cleaned, prod.id);
      updatedCount++;
    }
  }

  console.log(`[UPDATE DESCRIPTION] Successfully cleaned ${updatedCount} product description(s).`);
})();

const sampleProducts = db.prepare("SELECT id, name, description FROM products LIMIT 5").all();
console.log("[UPDATE DESCRIPTION] Sample updated products:", sampleProducts);

db.close();
