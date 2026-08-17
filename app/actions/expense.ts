"use server";

import { expenseService } from "@/lib/services/expense.service";
import { CreateExpenseInput, Expense } from "@/lib/types/expense";
import { ActionResult } from "@/lib/types/auth";
import { revalidatePath } from "next/cache";

export async function createExpenseAction(
  input: CreateExpenseInput
): Promise<ActionResult<Expense>> {
  const result = await expenseService.createExpense(input);
  if (result.success) {
    revalidatePath("/expenses");
    revalidatePath("/home");
    revalidatePath("/summary");
  }
  return result;
}

export async function getExpensesAction(startDate?: string, endDate?: string): Promise<Expense[]> {
  try {
    return await expenseService.getExpenses(startDate, endDate);
  } catch (error: any) {
    console.error("Failed to fetch expenses:", error);
    return [];
  }
}
