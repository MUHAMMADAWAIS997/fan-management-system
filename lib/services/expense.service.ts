import { expenseRepository } from "@/lib/repositories/expense.repository";
import { Expense, CreateExpenseInput } from "@/lib/types/expense";
import { ActionResult } from "@/lib/types/auth";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export class ExpenseService {
  /**
   * Fetch all expenses
   */
  public async getExpenses(startDate?: string, endDate?: string): Promise<Expense[]> {
    const start = startDate !== undefined ? startDate : getDefaultStartDate(60);
    const end = endDate !== undefined ? endDate : getDefaultEndDate();
    return expenseRepository.getAll(start || undefined, end || undefined);
  }

  /**
   * Add a manual expense record (Fuel, Transport, Rent, Utilities, Salaries, Other)
   */
  public async createExpense(input: CreateExpenseInput): Promise<ActionResult<Expense>> {
    if (!input.category || input.category.trim().length === 0) {
      return {
        success: false,
        message: "Category is required.",
        errors: { category: ["Expense category is required."] },
      };
    }

    if (!input.amount || isNaN(Number(input.amount)) || Number(input.amount) <= 0) {
      return {
        success: false,
        message: "Amount must be greater than zero.",
        errors: { amount: ["Enter a valid positive expense amount."] },
      };
    }

    if (!input.date) {
      return {
        success: false,
        message: "Date is required.",
        errors: { date: ["Date is required."] },
      };
    }

    const expense = expenseRepository.create(input);

    return {
      success: true,
      message: "Expense recorded successfully.",
      data: expense,
    };
  }
}

export const expenseService = new ExpenseService();
