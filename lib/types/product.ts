export interface Product {
  id: number;
  name: string;
  description?: string | null;
  type: string;
  size: string;
  supplier_id: number;
  supplier_name?: string;
  quantity: number;
  retail_price: number;
  discount: number;
  cost: number;
  status: "active" | "inactive" | string;
  created_at?: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  type: string;
  size: string;
  supplier_id: number;
  quantity: number;
  retail_price: number;
  discount: number;
  cost: number;
  status?: string;
}

export interface UpdateProductInput extends CreateProductInput {
  id: number;
}
