const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(process.cwd(), "sqlite.db");
const db = new Database(DB_PATH);

let targetSupplier = db.prepare("SELECT id FROM suppliers ORDER BY id ASC LIMIT 1").get();
if (!targetSupplier) {
  const ins = db.prepare("INSERT INTO suppliers (name, phone, contact_person) VALUES (?, ?, ?)").run("PAK FANS", "03001234567", "Sales Manager");
  targetSupplier = { id: ins.lastInsertRowid };
}
const supplierId = targetSupplier.id;
const quantity = 10;
const discountPercent = 10; // 10%

const products = [
  // Page 1
  { name: "Deluxe", type: "Ceiling Fan", size: '36 inch', retail_price: 8695 },
  { name: "Deluxe (Plus)", type: "Ceiling Fan", size: '56 inch', retail_price: 10995 },
  { name: "Super Deluxe", type: "Ceiling Fan", size: '56 inch', retail_price: 11195 },
  { name: "Elite/Crystal", type: "Ceiling Fan", size: '56 inch', retail_price: 11090 },
  { name: "Water Proof", type: "Ceiling Fan", size: '56 inch', retail_price: 11395 },
  { name: "Diamond Antique Small 3 Blades", type: "Ceiling Fan", size: '56 inch', retail_price: 12090 },
  { name: "Diamond Antique Small 4 Blades", type: "Ceiling Fan", size: '56 inch', retail_price: 12695 },
  { name: "Elegance", type: "Ceiling Fan", size: '56 inch', retail_price: 16195 },
  { name: "Delite AC/DC", type: "Ceiling Fan AC/DC", size: '56 inch', retail_price: 10490 },
  { name: "Elite/Crystal AC/DC", type: "Ceiling Fan AC/DC", size: '56 inch', retail_price: 10995 },
  { name: "Phantom AC/DC", type: "Ceiling Fan AC/DC", size: '56 inch', retail_price: 10490 },
  { name: "Diamond Antique Small 3 Blades AC/DC", type: "Ceiling Fan AC/DC", size: '56 inch', retail_price: 11995 },
  { name: "Diamond Antique Small 4 Blades AC/DC", type: "Ceiling Fan AC/DC", size: '56 inch', retail_price: 12795 },
  { name: "Imperial AC/DC", type: "Ceiling Fan AC/DC", size: '56 inch', retail_price: 21495 },
  { name: "Majestic AC/DC", type: "Ceiling Fan AC/DC", size: '56 inch', retail_price: 15895 },

  // Page 2
  { name: "Crystal ECO MAX", type: "Ceiling Fan 30W Inverter", size: '56 inch', retail_price: 12645 },
  { name: "Delite ECO MAX", type: "Ceiling Fan 30W Inverter", size: '56 inch', retail_price: 11745 },
  { name: "Pedestal Standard / Industrial", type: "Pedestal Fan", size: '24 inch', retail_price: 16095 },
  { name: "Pedestal Unique", type: "Pedestal Fan", size: '24 inch', retail_price: 15595 },
  { name: "Pedestal Industrial Mist", type: "Pedestal Fan", size: '24 inch', retail_price: 15995 },
  { name: "Table Cum Pedestal Plastic Body (NTCP)", type: "Pedestal Fan", size: '18 inch', retail_price: 10800 },
  { name: "Table Fan", type: "Table Fan", size: '18 inch', retail_price: 10200 },
  { name: "Bracket Deluxe", type: "Bracket Fan", size: '12 inch', retail_price: 7100 },

  // Page 3
  { name: "Bracket Super King 16\"", type: "Bracket Fan", size: '16 inch', retail_price: 9625 },
  { name: "Bracket Super King 18\"", type: "Bracket Fan", size: '18 inch', retail_price: 9700 },
  { name: "Bracket Auto", type: "Bracket Fan", size: '18 inch', retail_price: 10000 },
  { name: "Bracket Super King Remote", type: "Bracket Fan", size: '18 inch', retail_price: 10800 },
  { name: "Bracket Super King (Economy) Unique", type: "Bracket Fan", size: '18 inch', retail_price: 10500 },
  { name: "Bracket Deluxe 24\"", type: "Bracket Fan", size: '24 inch', retail_price: 15150 },
  { name: "Mega Bracket AC/DC", type: "Bracket Fan AC/DC", size: '24 inch', retail_price: 15795 },
];

const insertStmt = db.prepare(`
  INSERT INTO products (name, description, type, size, supplier_id, quantity, retail_price, discount, cost)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let insertedCount = 0;

db.transaction(() => {
  for (const item of products) {
    const discountAmount = Number((item.retail_price * (discountPercent / 100)).toFixed(2));
    const cost = Number((item.retail_price - discountAmount).toFixed(2));
    const description = `${item.name} (${item.size}) - PAK FANS`;

    insertStmt.run(
      item.name,
      description,
      item.type,
      item.size,
      supplierId,
      quantity,
      item.retail_price,
      discountAmount,
      cost
    );
    insertedCount++;
  }
})();

console.log(`[SEED SUCCESS] Added ${insertedCount} yellow marked products for PAK FANS supplier.`);
db.close();
