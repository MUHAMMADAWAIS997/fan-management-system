import { supplierLedgerRepository } from "@/lib/repositories/supplier_ledger.repository";
import { SupplierLedgerEntry, RecordSupplierPaymentInput } from "@/lib/types/supplier_ledger";
import { ActionResult } from "@/lib/types/auth";
import { db } from "@/lib/db";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export class SupplierLedgerService {
  /**
   * Fetch supplier ledger history
   */
  public async getSupplierLedger(supplierId: number, startDate?: string, endDate?: string): Promise<SupplierLedgerEntry[]> {
    const start = startDate !== undefined ? startDate : getDefaultStartDate(60);
    const end = endDate !== undefined ? endDate : getDefaultEndDate();
    return supplierLedgerRepository.getBySupplierId(supplierId, start || undefined, end || undefined);
  }

  /**
   * Fetch current balance for a supplier
   */
  public async getSupplierBalance(supplierId: number): Promise<number> {
    return supplierLedgerRepository.getSupplierCurrentBalance(supplierId);
  }

  /**
   * Record manual payment to supplier (and optionally log as expense if paid out of pocket)
   */
  public async recordSupplierPayment(
    input: RecordSupplierPaymentInput
  ): Promise<ActionResult<SupplierLedgerEntry>> {
    if (!input.supplier_id || input.supplier_id <= 0) {
      return { success: false, message: "Invalid supplier selected." };
    }

    if (!input.amount || isNaN(Number(input.amount)) || Number(input.amount) <= 0) {
      return { success: false, message: "Payment amount must be greater than zero." };
    }

    if (!input.date) {
      return { success: false, message: "Date is required." };
    }

    // Execute in transaction to log in both ledger and expenses
    const transaction = db.transaction(() => {
      const entry = supplierLedgerRepository.recordPayment(input);

      // Record in expenses
      const insertExpenseStmt = db.prepare(`
        INSERT INTO expenses (category, description, amount, date, reference_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      insertExpenseStmt.run(
        "Supplier Payment",
        input.description || `Payment made to Supplier #${input.supplier_id}`,
        input.amount,
        input.date,
        input.invoice_number || "PAYMENT"
      );

      return entry;
    });

    const entry = transaction();

    return {
      success: true,
      message: "Payment recorded in supplier ledger & expense log successfully.",
      data: entry,
    };
  }
}

export const supplierLedgerService = new SupplierLedgerService();
