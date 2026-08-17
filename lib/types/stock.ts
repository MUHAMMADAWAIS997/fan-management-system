export type PaymentStatus = "paid" | "partial" | "unpaid";

export interface StockItemInput {
  product_id: number;
  quantity: number;
  unit_retail_price: number;
  unit_discount_percent: number;
}

export interface ReceiveMultiStockInput {
  company_id: number;
  purchase_date: string;
  invoice_number: string;
  payment_status: PaymentStatus;
  paid_amount: number;
  items: StockItemInput[];
}

export interface StockBatchItem {
  id: number;
  batch_id: number;
  product_id: number;
  product_name?: string;
  product_type?: string;
  product_size?: string;
  quantity: number;
  unit_retail_price: number;
  unit_discount_percent: number;
  unit_cost: number;
  total_cost: number;
  created_at?: string;
}

export interface StockBatchSummary {
  id: number;
  company_id: number;
  company_name?: string;
  company_phone?: string;
  purchase_date: string;
  invoice_number: string;
  total_amount: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  created_at: string;
  item_count?: number;
  items?: StockBatchItem[];
}

export interface AvailableStockRecord {
  item_id: number;
  batch_id: number;
  invoice_number: string;
  purchase_date: string;
  company_id: number;
  supplier_name: string;
  product_id: number;
  product_name: string;
  product_type: string;
  product_size: string;
  current_available_qty: number;
  batch_received_qty: number;
  unit_retail_price: number; // RP
  unit_discount_percent: number; // Discount %
  unit_cost: number; // Purchased cost per unit
  unit_margin: number; // Profit margin per unit (RP * Disc%)
  total_stock_value: number; // Available Qty * RP
  total_stock_cost: number; // Available Qty * Unit Cost
  total_potential_profit: number; // Available Qty * Unit Margin
}
