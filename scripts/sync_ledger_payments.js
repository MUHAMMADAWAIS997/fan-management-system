const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(process.cwd(), "sqlite.db");
const db = new Database(DB_PATH);

console.log("[SYNC] Syncing customer debt return payments to sales invoices...");

db.transaction(() => {
  // Fetch all customers
  const customers = db.prepare("SELECT id FROM customers").all();

  for (const cust of customers) {
    // Total debt payments received for customer (sale_id IS NULL)
    const paidRow = db.prepare(`
      SELECT COALESCE(SUM(debit), 0) AS totalPaid
      FROM customer_ledger
      WHERE customer_id = ? AND sale_id IS NULL AND debit > 0
    `).get(cust.id);

    let remainingPaid = paidRow ? paidRow.totalPaid : 0;
    if (remainingPaid <= 0) continue;

    // Fetch unpaid sales invoices for this customer
    const unpaidSales = db.prepare(`
      SELECT id, total_amount, paid_amount
      FROM sales
      WHERE customer_id = ? AND payment_status != 'paid'
      ORDER BY id ASC
    `).all(cust.id);

    const updateSaleStmt = db.prepare(`
      UPDATE sales SET paid_amount = ?, payment_status = ? WHERE id = ?
    `);

    for (const sale of unpaidSales) {
      if (remainingPaid <= 0) break;
      const due = sale.total_amount - sale.paid_amount;
      if (due <= 0) continue;

      const alloc = Math.min(due, remainingPaid);
      const newPaid = Number((sale.paid_amount + alloc).toFixed(2));
      const newStatus = newPaid >= sale.total_amount ? "paid" : "partial";

      updateSaleStmt.run(newPaid, newStatus, sale.id);
      remainingPaid -= alloc;
    }
  }

  console.log("[SYNC] Syncing supplier debt payments to stock batches...");

  const suppliers = db.prepare("SELECT id FROM suppliers").all();

  for (const sup of suppliers) {
    const paidRow = db.prepare(`
      SELECT COALESCE(SUM(debit), 0) AS totalPaid
      FROM supplier_ledger
      WHERE supplier_id = ? AND batch_id IS NULL AND debit > 0
    `).get(sup.id);

    let remainingPaid = paidRow ? paidRow.totalPaid : 0;
    if (remainingPaid <= 0) continue;

    const unpaidBatches = db.prepare(`
      SELECT id, total_amount, paid_amount
      FROM stock_batches
      WHERE company_id = ? AND payment_status != 'paid'
      ORDER BY id ASC
    `).all(sup.id);

    const updateBatchStmt = db.prepare(`
      UPDATE stock_batches SET paid_amount = ?, payment_status = ? WHERE id = ?
    `);

    for (const batch of unpaidBatches) {
      if (remainingPaid <= 0) break;
      const due = batch.total_amount - batch.paid_amount;
      if (due <= 0) continue;

      const alloc = Math.min(due, remainingPaid);
      const newPaid = Number((batch.paid_amount + alloc).toFixed(2));
      const newStatus = newPaid >= batch.total_amount ? "paid" : "partial";

      updateBatchStmt.run(newPaid, newStatus, batch.id);
      remainingPaid -= alloc;
    }
  }
})();

console.log("[SYNC SUCCESS] All customer & supplier ledger payments synced to sales and stock_batches.");
db.close();
