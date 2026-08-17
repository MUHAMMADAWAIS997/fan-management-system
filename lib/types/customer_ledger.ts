export interface CustomerLedgerEntry {
  id: number;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  sale_id?: number | null;
  invoice_number?: string | null;
  date: string;
  description: string;
  debit: number;   // Payment received from customer (reduces balance owed)
  credit: number;  // Sale invoice charged to customer (increases balance owed)
  balance: number; // Cumulative balance owed by customer
  created_at: string;
}

export interface RecordCustomerPaymentInput {
  customer_id: number;
  date: string;
  amount: number;
  description?: string;
  reference_id?: string;
}
