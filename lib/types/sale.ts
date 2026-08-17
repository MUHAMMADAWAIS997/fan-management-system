export type PaymentStatus = "paid" | "partial" | "unpaid";

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name?: string;
  product_type?: string;
  product_size?: string;
  quantity: number;
  unit_retail_price: number;
  unit_discount_percent: number;
  unit_cost: number;
  unit_sale_price: number;
  total_price: number;
  created_at?: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  customer_id?: number | null;
  customer_name: string;
  customer_phone?: string | null;
  sale_date: string;
  total_amount: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  shop_name?: string | null;
  shop_tagline?: string | null;
  shop_phone?: string | null;
  shop_address?: string | null;
  created_at: string;
  item_count?: number;
  items?: SaleItem[];
}

export interface CreateSaleItemInput {
  product_id: number;
  quantity: number;
  unit_retail_price: number;
  unit_discount_percent: number;
}

export interface CreateSaleInput {
  customer_id?: number | null;
  customer_name: string;
  customer_phone?: string;
  sale_date: string;
  invoice_number: string;
  payment_status: PaymentStatus;
  paid_amount: number;
  shop_name?: string;
  shop_tagline?: string;
  shop_phone?: string;
  shop_address?: string;
  items: CreateSaleItemInput[];
}
