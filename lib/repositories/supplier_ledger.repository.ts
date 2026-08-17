import db from "@/lib/db";
import { SupplierLedgerEntry, RecordSupplierPaymentInput } from "@/lib/types/supplier_ledger";

export class SupplierLedgerRepository {
  /**
   * Get ledger records for a supplier
   */
  public getBySupplierId(supplierId: number, startDate?: string, endDate?: string): SupplierLedgerEntry[] {
    let query = `
      SELECT 
        l.id,
        l.supplier_id,
        s.name AS supplier_name,
        l.batch_id,
        l.invoice_number,
        l.date,
        l.description,
        l.debit,
        l.credit,
        l.balance,
        l.created_at
      FROM supplier_ledger l
      JOIN suppliers s ON l.supplier_id = s.id
      WHERE l.supplier_id = ?
    `;

    const params: any[] = [supplierId];

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
    return stmt.all(...params) as SupplierLedgerEntry[];
  }

  /**
   * Get current net balance owed to a supplier
   */
  public getSupplierCurrentBalance(supplierId: number): number {
    const stmt = db.prepare<[number], { balance: number }>(`
      SELECT balance FROM supplier_ledger 
      WHERE supplier_id = ? 
      ORDER BY id DESC LIMIT 1
    `);
    const row = stmt.get(supplierId);
    return row ? row.balance : 0;
  }

  /**
   * Record a transaction in supplier_ledger wrapped in an ACID transaction
   */
  public addLedgerEntry(entry: {
    supplier_id: number;
    batch_id?: number | null;
    invoice_number?: string | null;
    date: string;
    description: string;
    debit: number;  // Payment to supplier
    credit: number; // Purchase from supplier
  }): SupplierLedgerEntry {
    const transaction = db.transaction(() => {
      const currentBal = this.getSupplierCurrentBalance(entry.supplier_id);
      const netChange = entry.credit - entry.debit;
      const newBalance = Number((currentBal + netChange).toFixed(2));

      const stmt = db.prepare(`
        INSERT INTO supplier_ledger (
          supplier_id,
          batch_id,
          invoice_number,
          date,
          description,
          debit,
          credit,
          balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const res = stmt.run(
        entry.supplier_id,
        entry.batch_id || null,
        entry.invoice_number || null,
        entry.date,
        entry.description,
        entry.debit,
        entry.credit,
        newBalance
      );

      const getStmt = db.prepare<[number], SupplierLedgerEntry>(`
        SELECT id, supplier_id, batch_id, invoice_number, date, description, debit, credit, balance, created_at
        FROM supplier_ledger WHERE id = ?
      `);

      return getStmt.get(res.lastInsertRowid as number)!;
    });

    return transaction();
  }

  /**
   * Record manual payment to supplier wrapped in an ACID transaction
   */
  public recordPayment(input: RecordSupplierPaymentInput): SupplierLedgerEntry {
    const transaction = db.transaction(() => {
      const entry = this.addLedgerEntry({
        supplier_id: input.supplier_id,
        invoice_number: input.invoice_number || "PAYMENT",
        date: input.date,
        description: input.description || `Payment made to supplier`,
        debit: input.amount,
        credit: 0,
      });

      // Allocate payment to unpaid stock_batches for this supplier (oldest first)
      let remainingAlloc = input.amount;
      const unpaidBatchesStmt = db.prepare<[number], { id: number; total_amount: number; paid_amount: number }>(`
        SELECT id, total_amount, paid_amount 
        FROM stock_batches 
        WHERE company_id = ? AND payment_status != 'paid'
        ORDER BY id ASC
      `);
      const unpaidBatches = unpaidBatchesStmt.all(input.supplier_id);

      const updateBatchStmt = db.prepare(`
        UPDATE stock_batches 
        SET paid_amount = ?, payment_status = ? 
        WHERE id = ?
      `);

      for (const batch of unpaidBatches) {
        if (remainingAlloc <= 0) break;
        const due = batch.total_amount - batch.paid_amount;
        if (due <= 0) continue;

        const alloc = Math.min(due, remainingAlloc);
        const newPaid = Number((batch.paid_amount + alloc).toFixed(2));
        const newStatus = newPaid >= batch.total_amount ? "paid" : "partial";

        updateBatchStmt.run(newPaid, newStatus, batch.id);
        remainingAlloc -= alloc;
      }

      return entry;
    });

    return transaction();
  }
}

export const supplierLedgerRepository = new SupplierLedgerRepository();
