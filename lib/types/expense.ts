export type ExpenseCategory =
  | "Stock Purchase"
  | "Fuel"
  | "Transport"
  | "Rent"
  | "Utilities"
  | "Salaries"
  | "Other";

export interface Expense {
  id: number;
  category: ExpenseCategory | string;
  description?: string | null;
  amount: number;
  date: string;
  reference_id?: string | null;
  created_at?: string;
}

export interface CreateExpenseInput {
  category: string;
  description?: string;
  amount: number;
  date: string;
  reference_id?: string;
}
