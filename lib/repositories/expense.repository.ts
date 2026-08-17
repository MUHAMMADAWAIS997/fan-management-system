import db from "@/lib/db";
import { Expense, CreateExpenseInput } from "@/lib/types/expense";

export class ExpenseRepository {
  /**
   * Fetch all expense records
   */
  public getAll(startDate?: string, endDate?: string): Expense[] {
    let query = `
      SELECT id, category, description, amount, date, reference_id, created_at
      FROM expenses
    `;

    const params: string[] = [];
    const conditions: string[] = [];

    if (startDate) {
      conditions.push("date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("date <= ?");
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY date DESC, id DESC";

    const stmt = db.prepare(query);
    return stmt.all(...params) as Expense[];
  }

  /**
   * Create expense record wrapped in an ACID transaction
   */
  public create(input: CreateExpenseInput): Expense {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO expenses (category, description, amount, date, reference_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      const res = stmt.run(
        input.category,
        input.description || null,
        input.amount,
        input.date,
        input.reference_id || null
      );

      const getStmt = db.prepare<[number], Expense>(
        "SELECT id, category, description, amount, date, reference_id, created_at FROM expenses WHERE id = ?"
      );
      return getStmt.get(res.lastInsertRowid as number)!;
    });

    return transaction();
  }
}

export const expenseRepository = new ExpenseRepository();
