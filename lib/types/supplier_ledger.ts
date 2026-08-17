export interface SupplierLedgerEntry {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  batch_id?: number | null;
  invoice_number?: string | null;
  date: string;
  description: string;
  debit: number;   // Amount paid to supplier
  credit: number;  // Amount purchased from supplier
  balance: number; // Cumulative balance owed to supplier
  created_at?: string;
}

export interface RecordSupplierPaymentInput {
  supplier_id: number;
  date: string;
  amount: number;
  description?: string;
  invoice_number?: string;
}
