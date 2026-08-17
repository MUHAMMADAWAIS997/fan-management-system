/**
 * Unit tests for ExpenseService
 */

import { ExpenseService } from "@/lib/services/expense.service";

jest.mock("@/lib/repositories/expense.repository", () => ({
  expenseRepository: {
    getAll: jest.fn(),
    create: jest.fn(),
  },
}));

import { expenseRepository } from "@/lib/repositories/expense.repository";

const mockRepo = expenseRepository as jest.Mocked<typeof expenseRepository>;

const mockExpense = {
  id: 1,
  category: "Fuel",
  amount: 2000,
  date: "2024-01-20",
  description: "Delivery fuel",
  created_at: new Date().toISOString(),
};

const validInput = {
  category: "Fuel",
  amount: 2000,
  date: "2024-01-20",
  description: "Delivery fuel",
};

describe("ExpenseService", () => {
  let service: ExpenseService;

  beforeEach(() => {
    service = new ExpenseService();
  });

  // ── getExpenses ───────────────────────────────────────────────────────────
  describe("getExpenses()", () => {
    it("should return all expenses", async () => {
      mockRepo.getAll.mockReturnValue([mockExpense]);
      const result = await service.getExpenses();
      expect(result).toEqual([mockExpense]);
    });

    it("should return empty array when no expenses", async () => {
      mockRepo.getAll.mockReturnValue([]);
      expect(await service.getExpenses()).toEqual([]);
    });
  });

  // ── createExpense ─────────────────────────────────────────────────────────
  describe("createExpense()", () => {
    it("should create expense with valid input", async () => {
      mockRepo.create.mockReturnValue(mockExpense);
      const result = await service.createExpense(validInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExpense);
      expect(result.message).toBe("Expense recorded successfully.");
    });

    it("should fail when category is empty", async () => {
      const result = await service.createExpense({ ...validInput, category: "" });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("category");
    });

    it("should fail when category is only whitespace", async () => {
      const result = await service.createExpense({ ...validInput, category: "   " });
      expect(result.success).toBe(false);
    });

    it("should fail when amount is zero", async () => {
      const result = await service.createExpense({ ...validInput, amount: 0 });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("amount");
    });

    it("should fail when amount is negative", async () => {
      const result = await service.createExpense({ ...validInput, amount: -500 });
      expect(result.success).toBe(false);
    });

    it("should fail when amount is NaN (string input)", async () => {
      const result = await service.createExpense({ ...validInput, amount: "not-a-number" });
      expect(result.success).toBe(false);
    });

    it("should fail when date is missing", async () => {
      const result = await service.createExpense({ ...validInput, date: "" });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("date");
    });

    it("should succeed without description (optional)", async () => {
      const { description: _, ...withoutDesc } = validInput;
      mockRepo.create.mockReturnValue({ ...mockExpense, description: undefined });
      const result = await service.createExpense(withoutDesc);
      expect(result.success).toBe(true);
    });

    it("should accept all valid categories", async () => {
      const categories = ["Fuel", "Transport", "Rent", "Utilities", "Salaries", "Other"];
      for (const category of categories) {
        mockRepo.create.mockReturnValue({ ...mockExpense, category });
        const result = await service.createExpense({ ...validInput, category });
        expect(result.success).toBe(true);
      }
    });
  });
});
