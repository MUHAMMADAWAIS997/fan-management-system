/**
 * Unit tests for ProductService
 * Key logic tested:
 *  - calculateCost() pure function
 *  - createProduct() / updateProduct() with supplier verification
 *  - toggleProductStatus() guard clauses
 *  - deleteProduct() guard clauses
 */

import { ProductService } from "@/lib/services/product.service";

jest.mock("@/lib/repositories/product.repository", () => ({
  productRepository: {
    getAll: jest.fn(),
    getActiveOnly: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleStatus: jest.fn(),
    getProductHistory: jest.fn(),
  },
}));

jest.mock("@/lib/repositories/supplier.repository", () => ({
  supplierRepository: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { productRepository } from "@/lib/repositories/product.repository";
import { supplierRepository } from "@/lib/repositories/supplier.repository";

const mockProductRepo = productRepository as jest.Mocked<typeof productRepository>;
const mockSupplierRepo = supplierRepository as jest.Mocked<typeof supplierRepository>;

const mockSupplier = { id: 1, name: "GFC Fans", phone: "042-1234567", created_at: "" };
const mockProduct = {
  id: 1,
  name: "Ceiling Fan 56\"",
  description: "",
  type: "Ceiling",
  size: "56\"",
  supplier_id: 1,
  quantity: 50,
  retail_price: 5000,
  discount: 500,   // 10% of 5000
  cost: 4500,
  status: "active",
  created_at: new Date().toISOString(),
};

const validProductInput = {
  name: "Ceiling Fan 56\"",
  type: "Ceiling",
  size: "56\"",
  supplier_id: 1,
  quantity: 50,
  retail_price: 5000,
  discount: 10, // discount percent during creation
  status: "active",
};

describe("ProductService", () => {
  let service: ProductService;

  beforeEach(() => {
    service = new ProductService();
  });

  // ── calculateCost ─────────────────────────────────────────────────────────
  describe("calculateCost()", () => {
    it("should calculate correct discount amount and cost for 10% discount", () => {
      const { discountAmount, cost } = service.calculateCost(5000, 10);
      expect(discountAmount).toBe(500);
      expect(cost).toBe(4500);
    });

    it("should calculate 0% discount correctly (full retail price)", () => {
      const { discountAmount, cost } = service.calculateCost(5000, 0);
      expect(discountAmount).toBe(0);
      expect(cost).toBe(5000);
    });

    it("should calculate 100% discount (cost = 0)", () => {
      const { discountAmount, cost } = service.calculateCost(5000, 100);
      expect(discountAmount).toBe(5000);
      expect(cost).toBe(0);
    });

    it("should never return negative cost (floor at 0)", () => {
      // Although schema prevents >100%, test the pure math fallback
      const { cost } = service.calculateCost(5000, 150);
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    it("should handle decimal percentages correctly", () => {
      const { discountAmount, cost } = service.calculateCost(1000, 12.5);
      expect(discountAmount).toBe(125);
      expect(cost).toBe(875);
    });

    it("should handle zero retail price", () => {
      const { discountAmount, cost } = service.calculateCost(0, 10);
      expect(discountAmount).toBe(0);
      expect(cost).toBe(0);
    });
  });

  // ── getProducts ───────────────────────────────────────────────────────────
  describe("getProducts()", () => {
    it("should return all products", async () => {
      mockProductRepo.getAll.mockReturnValue([mockProduct]);
      const result = await service.getProducts();
      expect(result).toEqual([mockProduct]);
    });
  });

  describe("getActiveProducts()", () => {
    it("should return only active products", async () => {
      mockProductRepo.getActiveOnly.mockReturnValue([mockProduct]);
      const result = await service.getActiveProducts();
      expect(result).toEqual([mockProduct]);
    });
  });

  // ── createProduct ─────────────────────────────────────────────────────────
  describe("createProduct()", () => {
    it("should create product when supplier exists and data is valid", async () => {
      mockSupplierRepo.getById.mockReturnValue(mockSupplier);
      mockProductRepo.create.mockReturnValue(mockProduct);

      const result = await service.createProduct(validProductInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(result.message).toBe("Product added successfully.");
    });

    it("should fail when supplier does not exist", async () => {
      mockSupplierRepo.getById.mockReturnValue(undefined);
      const result = await service.createProduct(validProductInput);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Selected supplier does not exist.");
      expect(result.errors).toHaveProperty("supplier_id");
    });

    it("should fail when name is shorter than 2 characters", async () => {
      const result = await service.createProduct({ ...validProductInput, name: "X" });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("name");
    });

    it("should fail when retail_price is negative", async () => {
      const result = await service.createProduct({ ...validProductInput, retail_price: -1 });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("retail_price");
    });

    it("should fail when discount exceeds 100%", async () => {
      const result = await service.createProduct({ ...validProductInput, discount: 110 });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("discount");
    });

    it("should fail when quantity is negative", async () => {
      const result = await service.createProduct({ ...validProductInput, quantity: -5 });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("quantity");
    });

    it("should fail for missing type field", async () => {
      const { type: _, ...withoutType } = validProductInput;
      const result = await service.createProduct(withoutType);
      expect(result.success).toBe(false);
    });
  });

  // ── updateProduct ─────────────────────────────────────────────────────────
  describe("updateProduct()", () => {
    const updateInput = { ...validProductInput, id: 1 };

    it("should update product successfully", async () => {
      mockSupplierRepo.getById.mockReturnValue(mockSupplier);
      mockProductRepo.update.mockReturnValue(mockProduct);

      const result = await service.updateProduct(updateInput);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Product updated successfully.");
    });

    it("should return failure when product is not found", async () => {
      mockSupplierRepo.getById.mockReturnValue(mockSupplier);
      mockProductRepo.update.mockReturnValue(null);

      const result = await service.updateProduct(updateInput);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Product not found.");
    });

    it("should fail when supplier does not exist during update", async () => {
      mockSupplierRepo.getById.mockReturnValue(undefined);
      const result = await service.updateProduct(updateInput);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Selected supplier does not exist.");
    });

    it("should fail when id is missing from update input", async () => {
      const result = await service.updateProduct(validProductInput);
      expect(result.success).toBe(false);
    });
  });

  // ── toggleProductStatus ───────────────────────────────────────────────────
  describe("toggleProductStatus()", () => {
    it("should toggle status to inactive", async () => {
      mockProductRepo.toggleStatus.mockReturnValue({ ...mockProduct, status: "inactive" });
      const result = await service.toggleProductStatus(1, "inactive");
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("inactive");
    });

    it("should return failure when product is not found", async () => {
      mockProductRepo.toggleStatus.mockReturnValue(null);
      const result = await service.toggleProductStatus(999, "inactive");
      expect(result.success).toBe(false);
      expect(result.message).toBe("Product not found.");
    });

    it("should reject invalid id (0)", async () => {
      const result = await service.toggleProductStatus(0, "inactive");
      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid product ID.");
    });

    it("should reject non-numeric id", async () => {
      const result = await service.toggleProductStatus("abc" as unknown as number, "active");
      expect(result.success).toBe(false);
    });
  });

  // ── deleteProduct ─────────────────────────────────────────────────────────
  describe("deleteProduct()", () => {
    it("should delete product successfully", async () => {
      mockProductRepo.delete.mockReturnValue({ success: true });
      const result = await service.deleteProduct(1);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Product deleted successfully.");
    });

    it("should fail when product has stock history", async () => {
      mockProductRepo.delete.mockReturnValue({ success: false, reason: "Product has existing stock records." });
      const result = await service.deleteProduct(1);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Product has existing stock records.");
    });

    it("should reject non-numeric id", async () => {
      const result = await service.deleteProduct("xyz" as unknown as number);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid product ID.");
    });

    it("should reject id = 0", async () => {
      const result = await service.deleteProduct(0);
      expect(result.success).toBe(false);
    });
  });
});
