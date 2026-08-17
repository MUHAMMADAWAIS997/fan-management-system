/**
 * Unit tests for SupplierService
 */

import { SupplierService } from "@/lib/services/supplier.service";

jest.mock("@/lib/repositories/supplier.repository", () => ({
  supplierRepository: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { supplierRepository } from "@/lib/repositories/supplier.repository";

const mockRepo = supplierRepository as jest.Mocked<typeof supplierRepository>;

const mockSupplier = {
  id: 1,
  name: "GFC Fans",
  phone: "042-1234567",
  created_at: new Date().toISOString(),
};

const validInput = { name: "GFC Fans", phone: "042-1234567" };

describe("SupplierService", () => {
  let service: SupplierService;

  beforeEach(() => {
    service = new SupplierService();
  });

  // ── getSuppliers ──────────────────────────────────────────────────────────
  describe("getSuppliers()", () => {
    it("should return all suppliers", async () => {
      mockRepo.getAll.mockReturnValue([mockSupplier]);
      const result = await service.getSuppliers();
      expect(result).toEqual([mockSupplier]);
    });

    it("should return empty array when no suppliers", async () => {
      mockRepo.getAll.mockReturnValue([]);
      expect(await service.getSuppliers()).toEqual([]);
    });
  });

  // ── createSupplier ────────────────────────────────────────────────────────
  describe("createSupplier()", () => {
    it("should create a supplier with valid data", async () => {
      mockRepo.create.mockReturnValue(mockSupplier);
      const result = await service.createSupplier(validInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSupplier);
      expect(result.message).toBe("Supplier added successfully.");
    });

    it("should fail if name is less than 2 characters", async () => {
      const result = await service.createSupplier({ ...validInput, name: "X" });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("name");
    });

    it("should fail if name is empty", async () => {
      const result = await service.createSupplier({ ...validInput, name: "" });
      expect(result.success).toBe(false);
    });

    it("should fail if phone is too short (< 5 chars)", async () => {
      const result = await service.createSupplier({ ...validInput, phone: "123" });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("phone");
    });

    it("should fail if phone is missing", async () => {
      const result = await service.createSupplier({ name: "GFC Fans" });
      expect(result.success).toBe(false);
    });

    it("should return error for non-object input", async () => {
      const result = await service.createSupplier(null);
      expect(result.success).toBe(false);
    });
  });

  // ── updateSupplier ────────────────────────────────────────────────────────
  describe("updateSupplier()", () => {
    it("should update supplier successfully", async () => {
      mockRepo.update.mockReturnValue(mockSupplier);
      const result = await service.updateSupplier({ ...validInput, id: 1 });
      expect(result.success).toBe(true);
      expect(result.message).toBe("Supplier updated successfully.");
    });

    it("should return not-found error when supplier does not exist", async () => {
      mockRepo.update.mockReturnValue(null);
      const result = await service.updateSupplier({ ...validInput, id: 999 });
      expect(result.success).toBe(false);
      expect(result.message).toBe("Supplier not found.");
    });

    it("should fail when id is absent from update input", async () => {
      const result = await service.updateSupplier(validInput);
      expect(result.success).toBe(false);
    });
  });

  // ── deleteSupplier ────────────────────────────────────────────────────────
  describe("deleteSupplier()", () => {
    it("should delete supplier successfully", async () => {
      mockRepo.delete.mockReturnValue({ success: true });
      const result = await service.deleteSupplier(1);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Supplier deleted successfully.");
    });

    it("should fail when supplier has linked products", async () => {
      mockRepo.delete.mockReturnValue({ success: false, reason: "Supplier has linked products." });
      const result = await service.deleteSupplier(1);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Supplier has linked products.");
    });

    it("should fail for non-numeric id", async () => {
      const result = await service.deleteSupplier("abc" as unknown as number);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid supplier ID.");
    });

    it("should fail for id = 0", async () => {
      const result = await service.deleteSupplier(0);
      expect(result.success).toBe(false);
    });
  });
});
