import db from "@/lib/db";
import { CustomerLedgerEntry, RecordCustomerPaymentInput } from "@/lib/types/customer_ledger";

export class CustomerLedgerRepository {
  /**
   * Get ledger entries for a specific customer
   */
  public getLedgerByCustomerId(customerId: number, startDate?: string, endDate?: string): CustomerLedgerEntry[] {
    let query = `
      SELECT 
        l.id,
        l.customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        l.sale_id,
        l.invoice_number,
        l.date,
        l.description,
        l.debit,
        l.credit,
        l.balance,
        l.created_at
      FROM customer_ledger l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.customer_id = ?
    `;

    const params: any[] = [customerId];

    if (startDate) {
      query += " AND l.date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND l.date <= ?";
      params.push(endDate);
    }

    query += " ORDER BY l.id DESC";

    const stmt = db.prepare(query);
    return stmt.all(...params) as CustomerLedgerEntry[];
  }

  /**
   * Record debt return payment from customer
   */
  public recordPayment(input: RecordCustomerPaymentInput): CustomerLedgerEntry {
    const transaction = db.transaction(() => {
      // Get previous balance
      const prevBalStmt = db.prepare<[number], { balance: number }>(`
        SELECT balance FROM customer_ledger 
        WHERE customer_id = ? 
        ORDER BY id DESC LIMIT 1
      `);
      const prevRow = prevBalStmt.get(input.customer_id);
      const prevBalance = prevRow ? prevRow.balance : 0;

      const newBalance = Number((prevBalance - input.amount).toFixed(2));

      const insertStmt = db.prepare(`
        INSERT INTO customer_ledger (
          customer_id,
          date,
          description,
          debit,
          credit,
          balance
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      const desc = input.description || `Customer Debt Return / Payment (${input.reference_id ? '#' + input.reference_id : 'Cash'})`;

      const result = insertStmt.run(
        input.customer_id,
        input.date,
        desc,
        input.amount, // Debit = payment received from customer (reduces balance)
        0.0,          // Credit = 0
        newBalance
      );

      // Allocate payment to unpaid sales invoices for this customer (oldest first)
      let remainingAlloc = input.amount;
      const unpaidSalesStmt = db.prepare<[number], { id: number; total_amount: number; paid_amount: number }>(`
        SELECT id, total_amount, paid_amount 
        FROM sales 
        WHERE customer_id = ? AND payment_status != 'paid'
        ORDER BY id ASC
      `);
      const unpaidSales = unpaidSalesStmt.all(input.customer_id);

      const updateSaleStmt = db.prepare(`
        UPDATE sales 
        SET paid_amount = ?, payment_status = ? 
        WHERE id = ?
      `);

      for (const sale of unpaidSales) {
        if (remainingAlloc <= 0) break;
        const due = sale.total_amount - sale.paid_amount;
        if (due <= 0) continue;

        const alloc = Math.min(due, remainingAlloc);
        const newPaid = Number((sale.paid_amount + alloc).toFixed(2));
        const newStatus = newPaid >= sale.total_amount ? "paid" : "partial";

        updateSaleStmt.run(newPaid, newStatus, sale.id);
        remainingAlloc -= alloc;
      }

      const newId = result.lastInsertRowid as number;

      const getStmt = db.prepare<[number], CustomerLedgerEntry>(`
        SELECT 
          l.id,
          l.customer_id,
          c.name AS customer_name,
          c.phone AS customer_phone,
          l.sale_id,
          l.invoice_number,
          l.date,
          l.description,
          l.debit,
          l.credit,
          l.balance,
          l.created_at
        FROM customer_ledger l
        JOIN customers c ON l.customer_id = c.id
        WHERE l.id = ?
      `);

      return getStmt.get(newId)!;
    });

    return transaction();
  }
}

export const customerLedgerRepository = new CustomerLedgerRepository();
