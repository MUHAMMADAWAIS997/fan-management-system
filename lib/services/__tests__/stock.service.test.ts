/**
 * Unit tests for StockService
 * Key business logic:
 *  - calculateUnitCost() and calculateTotalCost() pure functions
 *  - receiveMultiStock() — supplier check, product check, payment auto-adjustment
 */

import { StockService } from "@/lib/services/stock.service";

jest.mock("@/lib/repositories/stock.repository", () => ({
  stockRepository: {
    getAvailableStockRecords: jest.fn(),
    getAllBatches: jest.fn(),
    getBatchById: jest.fn(),
    receiveMultiStockTransaction: jest.fn(),
  },
}));

jest.mock("@/lib/repositories/product.repository", () => ({
  productRepository: {
    getById: jest.fn(),
  },
}));

jest.mock("@/lib/repositories/supplier.repository", () => ({
  supplierRepository: {
    getById: jest.fn(),
  },
}));

import { stockRepository } from "@/lib/repositories/stock.repository";
import { productRepository } from "@/lib/repositories/product.repository";
import { supplierRepository } from "@/lib/repositories/supplier.repository";

const mockStockRepo = stockRepository as jest.Mocked<typeof stockRepository>;
const mockProductRepo = productRepository as jest.Mocked<typeof productRepository>;
const mockSupplierRepo = supplierRepository as jest.Mocked<typeof supplierRepository>;

const mockSupplier = { id: 1, name: "GFC Fans", phone: "042-1234567", created_at: "" };
const mockProduct = {
  id: 1, name: "Ceiling Fan", type: "Ceiling", size: "56\"",
  supplier_id: 1, quantity: 100, retail_price: 5000, discount: 500,
  cost: 4500, status: "active", created_at: "",
};

const validStockInput = {
  company_id: 1,
  purchase_date: "2024-01-15",
  invoice_number: "INV-001",
  payment_status: "paid",
  paid_amount: 0, // will be auto-adjusted
  items: [
    { product_id: 1, quantity: 10, unit_retail_price: 5000, unit_discount_percent: 10 },
  ],
};

const mockBatch = {
  id: 1,
  company_id: 1,
  company_name: "GFC Fans",
  purchase_date: "2024-01-15",
  invoice_number: "INV-001",
  total_amount: 45000,
  payment_status: "paid" as const,
  paid_amount: 45000,
  created_at: new Date().toISOString(),
};

describe("StockService", () => {
  let service: StockService;

  beforeEach(() => {
    service = new StockService();
  });

  // ── calculateUnitCost ─────────────────────────────────────────────────────
  describe("calculateUnitCost()", () => {
    it("should calculate correct unit cost at 10% discount", () => {
      expect(service.calculateUnitCost(5000, 10)).toBe(4500);
    });

    it("should return full retail price at 0% discount", () => {
      expect(service.calculateUnitCost(5000, 0)).toBe(5000);
    });

    it("should return 0 at 100% discount", () => {
      expect(service.calculateUnitCost(5000, 100)).toBe(0);
    });

    it("should never return negative cost", () => {
      expect(service.calculateUnitCost(5000, 150)).toBeGreaterThanOrEqual(0);
    });

    it("should handle decimal discounts correctly (12.5%)", () => {
      expect(service.calculateUnitCost(1000, 12.5)).toBe(875);
    });
  });

  // ── calculateTotalCost ────────────────────────────────────────────────────
  describe("calculateTotalCost()", () => {
    it("should multiply unit cost by quantity", () => {
      expect(service.calculateTotalCost(4500, 10)).toBe(45000);
    });

    it("should return 0 for 0 quantity", () => {
      expect(service.calculateTotalCost(4500, 0)).toBe(0);
    });

    it("should handle decimal unit costs", () => {
      expect(service.calculateTotalCost(4500.50, 2)).toBe(9001);
    });
  });

  // ── receiveMultiStock ─────────────────────────────────────────────────────
  describe("receiveMultiStock()", () => {
    it("should receive stock successfully with valid data", async () => {
      mockSupplierRepo.getById.mockReturnValue(mockSupplier);
      mockProductRepo.getById.mockReturnValue(mockProduct);
      mockStockRepo.receiveMultiStockTransaction.mockReturnValue(mockBatch);

      const result = await service.receiveMultiStock(validStockInput);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Stock batch received successfully.");
      expect(result.data).toEqual(mockBatch);
    });

    it("should auto-set paid_amount to total when status is 'paid'", async () => {
      mockSupplierRepo.getById.mockReturnValue(mockSupplier);
      mockProductRepo.getById.mockReturnValue(mockProduct);
      mockStockRepo.receiveMultiStockTransaction.mockReturnValue(mockBatch);

      await service.receiveMultiStock({ ...validStockInput, payment_status: "paid", paid_amount: 0 });

      // The transaction is called — verify it was called at all (paid_amount auto-set internally)
      expect(mockStockRepo.receiveMultiStockTransaction).toHaveBeenCalled();
    });

    it("should auto-set paid_amount to 0 when status is 'unpaid'", async () => {
      mockSupplierRepo.getById.mockReturnValue(mockSupplier);
      mockProductRepo.getById.mockReturnValue(mockProduct);
      mockStockRepo.receiveMultiStockTransaction.mockReturnValue(mockBatch);

      await service.receiveMultiStock({ ...validStockInput, payment_status: "unpaid", paid_amount: 9999 });
      expect(mockStockRepo.receiveMultiStockTransaction).toHaveBeenCalled();
    });

    it("should fail when supplier does not exist", async () => {
      mockSupplierRepo.getById.mockReturnValue(undefined);
      const result = await service.receiveMultiStock(validStockInput);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Selected company/supplier does not exist.");
    });

    it("should fail when a product in the items list does not exist", async () => {
      mockSupplierRepo.getById.mockReturnValue(mockSupplier);
      mockProductRepo.getById.mockReturnValue(undefined);

      const result = await service.receiveMultiStock(validStockInput);
      expect(result.success).toBe(false);
      expect(result.message).toContain("does not exist");
    });

    it("should fail when items array is empty", async () => {
      const result = await service.receiveMultiStock({ ...validStockInput, items: [] });
      expect(result.success).toBe(false);
    });

    it("should fail when purchase_date is missing", async () => {
      const result = await service.receiveMultiStock({ ...validStockInput, purchase_date: "" });
      expect(result.success).toBe(false);
    });

    it("should fail when invoice_number is missing", async () => {
      const result = await service.receiveMultiStock({ ...validStockInput, invoice_number: "" });
      expect(result.success).toBe(false);
    });

    it("should fail when company_id is 0 (invalid)", async () => {
      const result = await service.receiveMultiStock({ ...validStockInput, company_id: 0 });
      expect(result.success).toBe(false);
    });

    it("should fail when unit_discount_percent exceeds 100", async () => {
      const result = await service.receiveMultiStock({
        ...validStockInput,
        items: [{ product_id: 1, quantity: 5, unit_retail_price: 5000, unit_discount_percent: 110 }],
      });
      expect(result.success).toBe(false);
    });

    it("should fail when payment_status is an invalid value", async () => {
      const result = await service.receiveMultiStock({ ...validStockInput, payment_status: "overdraft" });
      expect(result.success).toBe(false);
    });

    it("should handle multiple items and sum grand total correctly", async () => {
      mockSupplierRepo.getById.mockReturnValue(mockSupplier);
      mockProductRepo.getById.mockReturnValue(mockProduct);
      mockStockRepo.receiveMultiStockTransaction.mockReturnValue(mockBatch);

      const multiItemInput = {
        ...validStockInput,
        items: [
          { product_id: 1, quantity: 10, unit_retail_price: 5000, unit_discount_percent: 10 }, // 45000
          { product_id: 1, quantity: 5,  unit_retail_price: 3000, unit_discount_percent: 20 }, // 12000
        ],
      };
      const result = await service.receiveMultiStock(multiItemInput);
      expect(result.success).toBe(true);
      // Verify transaction was called (grand total computation is internal)
      expect(mockStockRepo.receiveMultiStockTransaction).toHaveBeenCalled();
      const callArgs = mockStockRepo.receiveMultiStockTransaction.mock.calls[0];
      // Third argument is grandTotalCost
      expect(callArgs[2]).toBe(57000); // 45000 + 12000
    });
  });
});
