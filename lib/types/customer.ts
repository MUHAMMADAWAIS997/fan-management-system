export interface Customer {
  id: number;
  name: string;
  phone: string;
  location?: string | null;
  created_at?: string;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  location?: string;
}

export interface UpdateCustomerInput {
  id: number;
  name: string;
  phone: string;
  location?: string;
}
