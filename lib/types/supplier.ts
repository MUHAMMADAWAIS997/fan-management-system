export interface Supplier {
  id: number;
  name: string;
  phone: string;
  created_at?: string;
}

export interface CreateSupplierInput {
  name: string;
  phone: string;
}

export interface UpdateSupplierInput {
  id: number;
  name: string;
  phone: string;
}
