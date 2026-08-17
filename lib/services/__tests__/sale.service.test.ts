/**
 * Unit tests for SaleService
 * Key business logic:
 *  - Discount / price calculation per item
 *  - Grand total accumulation
 *  - Stock availability check
 *  - Credit/partial payment customer requirement
 *  - Paid amount vs grand total validation
 */

import { SaleService } from "@/lib/services/sale.service";

jest.mock("@/lib/repositories/sale.repository", () => ({
  saleRepository: {
    getAllSales: jest.fn(),
    getSaleById: jest.fn(),
    createSaleTransaction: jest.fn(),
  },
}));

jest.mock("@/lib/repositories/product.repository", () => ({
  productRepository: {
    getById: jest.fn(),
  },
}));

import { saleRepository } from "@/lib/repositories/sale.repository";
import { productRepository } from "@/lib/repositories/product.repository";

const mockSaleRepo = saleRepository as jest.Mocked<typeof saleRepository>;
const mockProductRepo = productRepository as jest.Mocked<typeof productRepository>;

// ─── Shared mock data ────────────────────────────────────────────────────────
const mockProduct = {
  id: 1,
  name: "Ceiling Fan",
  type: "Ceiling",
  size: "56\"",
  supplier_id: 1,
  quantity: 20,       // stock available
  retail_price: 5000,
  discount: 500,      // stored discount amount (10%)
  cost: 4500,
  status: "active",
  created_at: "",
};

const mockSale = {
  id: 1,
  customer_id: null,
  customer_name: "Walk-in Customer",
  customer_phone: "",
  sale_date: "2024-01-20",
  invoice_number: "SI-001",
  grand_total: 4500,
  payment_status: "paid" as const,
  paid_amount: 4500,
  created_at: new Date().toISOString(),
  items: [],
};

const validSaleInput = {
  customer_id: null,
  customer_name: "Walk-in Customer",
  customer_phone: "",
  sale_date: "2024-01-20",
  invoice_number: "SI-001",
  payment_status: "paid",
  paid_amount: 4500,
  items: [
    { product_id: 1, quantity: 1, unit_retail_price: 5000, unit_discount_percent: 10 },
  ],
};

describe("SaleService", () => {
  let service: SaleService;

  beforeEach(() => {
    service = new SaleService();
  });

  // ── getAllSales ────────────────────────────────────────────────────────────
  describe("getAllSales()", () => {
    it("should return all sales", async () => {
      mockSaleRepo.getAllSales.mockReturnValue([mockSale]);
      const result = await service.getAllSales();
      expect(result).toEqual([mockSale]);
    });

    it("should return empty array when no sales", async () => {
      mockSaleRepo.getAllSales.mockReturnValue([]);
      expect(await service.getAllSales()).toEqual([]);
    });
  });

  // ── getSaleById ───────────────────────────────────────────────────────────
  describe("getSaleById()", () => {
    it("should return a sale when found", async () => {
      mockSaleRepo.getSaleById.mockReturnValue(mockSale);
      const result = await service.getSaleById(1);
      expect(result).toEqual(mockSale);
    });

    it("should return null when not found", async () => {
      mockSaleRepo.getSaleById.mockReturnValue(null);
      expect(await service.getSaleById(999)).toBeNull();
    });
  });

  // ── recordSale ────────────────────────────────────────────────────────────
  describe("recordSale()", () => {
    it("should record a paid sale successfully (walk-in customer)", async () => {
      mockProductRepo.getById.mockReturnValue(mockProduct);
      mockSaleRepo.createSaleTransaction.mockReturnValue(mockSale);

      const result = await service.recordSale(validSaleInput as any);
      expect(result).toEqual(mockSale);
      expect(mockSaleRepo.createSaleTransaction).toHaveBeenCalled();
    });

    it("should correctly compute unit sale price with 10% discount", async () => {
      mockProductRepo.getById.mockReturnValue(mockProduct);
      mockSaleRepo.createSaleTransaction.mockReturnValue(mockSale);

      await service.recordSale(validSaleInput as any);

      const callArgs = mockSaleRepo.createSaleTransaction.mock.calls[0];
      const calculatedItems = callArgs[1];
      const grandTotal = callArgs[2];

      // unit_retail_price=5000, discount=10% => unit_sale_price=4500, total=4500*1=4500
      expect(calculatedItems[0].unit_sale_price).toBe(4500);
      expect(calculatedItems[0].total_price).toBe(4500);
      expect(grandTotal).toBe(4500);
    });

    it("should correctly compute grand total for multiple items", async () => {
      mockProductRepo.getById.mockReturnValue({ ...mockProduct, quantity: 50 });
      mockSaleRepo.createSaleTransaction.mockReturnValue(mockSale);

      const multiItemInput = {
        ...validSaleInput,
        paid_amount: 16500,
        items: [
          { product_id: 1, quantity: 2, unit_retail_price: 5000, unit_discount_percent: 10 }, // 9000
          { product_id: 1, quantity: 5, unit_retail_price: 2000, unit_discount_percent: 25 }, // 7500
        ],
      };

      await service.recordSale(multiItemInput as any);

      const callArgs = mockSaleRepo.createSaleTransaction.mock.calls[0];
      expect(callArgs[2]).toBe(16500); // 9000 + 7500
    });

    it("should throw if product is not found", async () => {
      mockProductRepo.getById.mockReturnValue(undefined);
      await expect(service.recordSale(validSaleInput as any)).rejects.toThrow("not found");
    });

    it("should throw when requested quantity exceeds available stock", async () => {
      mockProductRepo.getById.mockReturnValue({ ...mockProduct, quantity: 2 });

      const overStockInput = {
        ...validSaleInput,
        items: [{ product_id: 1, quantity: 10, unit_retail_price: 5000, unit_discount_percent: 10 }],
      };
      await expect(service.recordSale(overStockInput as any)).rejects.toThrow("Insufficient stock");
    });

    it("should throw for credit sale without a registered customer_id", async () => {
      mockProductRepo.getById.mockReturnValue(mockProduct);
      const creditInput = {
        ...validSaleInput,
        customer_id: null,
        payment_status: "unpaid",
        paid_amount: 0,
      };
      await expect(service.recordSale(creditInput as any)).rejects.toThrow(
        "Only registered customers can take credit"
      );
    });

    it("should throw for partial payment without a registered customer_id", async () => {
      mockProductRepo.getById.mockReturnValue(mockProduct);
      const partialInput = {
        ...validSaleInput,
        customer_id: null,
        payment_status: "partial",
        paid_amount: 2000,
      };
      await expect(service.recordSale(partialInput as any)).rejects.toThrow(
        "Only registered customers can take credit"
      );
    });

    it("should allow unpaid sale for a registered customer", async () => {
      mockProductRepo.getById.mockReturnValue(mockProduct);
      mockSaleRepo.createSaleTransaction.mockReturnValue(mockSale);

      const creditWithCustomer = {
        ...validSaleInput,
        customer_id: 5,
        payment_status: "unpaid",
        paid_amount: 0,
      };
      const result = await service.recordSale(creditWithCustomer as any);
      expect(result).toBeDefined();
    });

    it("should throw when paid_amount is less than grand_total for 'paid' status", async () => {
      mockProductRepo.getById.mockReturnValue(mockProduct);
      const underpaidInput = {
        ...validSaleInput,
        payment_status: "paid",
        paid_amount: 100, // less than 4500
      };
      await expect(service.recordSale(underpaidInput as any)).rejects.toThrow(
        "cannot be less than total invoice amount"
      );
    });

    it("should throw when items array is empty (schema level)", async () => {
      const emptyItemsInput = { ...validSaleInput, items: [] };
      await expect(service.recordSale(emptyItemsInput as any)).rejects.toThrow();
    });

    it("should throw when customer_name is missing", async () => {
      const noNameInput = { ...validSaleInput, customer_name: "" };
      await expect(service.recordSale(noNameInput as any)).rejects.toThrow();
    });

    it("should throw when invoice_number is missing", async () => {
      const noInvoiceInput = { ...validSaleInput, invoice_number: "" };
      await expect(service.recordSale(noInvoiceInput as any)).rejects.toThrow();
    });

    it("should handle 0% discount (full price sale)", async () => {
      mockProductRepo.getById.mockReturnValue({ ...mockProduct, quantity: 50 });
      mockSaleRepo.createSaleTransaction.mockReturnValue(mockSale);

      await service.recordSale({
        ...validSaleInput,
        paid_amount: 5000,
        items: [{ product_id: 1, quantity: 1, unit_retail_price: 5000, unit_discount_percent: 0 }],
      } as any);

      const callArgs = mockSaleRepo.createSaleTransaction.mock.calls[0];
      expect(callArgs[1][0].unit_sale_price).toBe(5000);
      expect(callArgs[2]).toBe(5000);
    });
  });
});
