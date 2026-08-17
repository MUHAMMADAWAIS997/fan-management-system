/**
 * Unit tests for CustomerService
 * Repositories are fully mocked so no SQLite DB is touched.
 */

import { CustomerService } from "@/lib/services/customer.service";

// ─── Mock the repository ────────────────────────────────────────────────────
jest.mock("@/lib/repositories/customer.repository", () => ({
  customerRepository: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

import { customerRepository } from "@/lib/repositories/customer.repository";

const mockRepo = customerRepository as jest.Mocked<typeof customerRepository>;

// ─── Helpers ────────────────────────────────────────────────────────────────
const validInput = { name: "Ali Khan", phone: "03001234567", location: "Lahore" };

const mockCustomer = {
  id: 1,
  name: "Ali Khan",
  phone: "03001234567",
  location: "Lahore",
  created_at: new Date().toISOString(),
};

// ─── Tests ──────────────────────────────────────────────────────────────────
describe("CustomerService", () => {
  let service: CustomerService;

  beforeEach(() => {
    service = new CustomerService();
  });

  // ── getCustomers ──────────────────────────────────────────────────────────
  describe("getCustomers()", () => {
    it("should return all customers from the repository", async () => {
      mockRepo.getAll.mockReturnValue([mockCustomer]);
      const result = await service.getCustomers();
      expect(result).toEqual([mockCustomer]);
      expect(mockRepo.getAll).toHaveBeenCalledTimes(1);
    });

    it("should return an empty array when no customers exist", async () => {
      mockRepo.getAll.mockReturnValue([]);
      const result = await service.getCustomers();
      expect(result).toEqual([]);
    });
  });

  // ── createCustomer ────────────────────────────────────────────────────────
  describe("createCustomer()", () => {
    it("should create and return a customer with valid data", async () => {
      mockRepo.create.mockReturnValue(mockCustomer);
      const result = await service.createCustomer(validInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(result.message).toBe("Customer added successfully.");
    });

    it("should fail when name is too short", async () => {
      const result = await service.createCustomer({ ...validInput, name: "A" });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("name");
    });

    it("should fail when name is missing", async () => {
      const result = await service.createCustomer({ ...validInput, name: "" });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("name");
    });

    it("should fail when phone is too short", async () => {
      const result = await service.createCustomer({ ...validInput, phone: "123" });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty("phone");
    });

    it("should succeed without location (optional field)", async () => {
      const { location: _, ...inputWithoutLocation } = validInput;
      mockRepo.create.mockReturnValue({ ...mockCustomer, location: "" });
      const result = await service.createCustomer(inputWithoutLocation);
      expect(result.success).toBe(true);
    });

    it("should return validation errors for completely empty input", async () => {
      const result = await service.createCustomer({});
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  // ── updateCustomer ────────────────────────────────────────────────────────
  describe("updateCustomer()", () => {
    const updateInput = { ...validInput, id: 1 };

    it("should update and return customer on success", async () => {
      mockRepo.update.mockReturnValue(mockCustomer);
      const result = await service.updateCustomer(updateInput);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
      expect(result.message).toBe("Customer updated successfully.");
    });

    it("should return failure when customer is not found", async () => {
      mockRepo.update.mockReturnValue(null);
      const result = await service.updateCustomer(updateInput);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Customer not found.");
    });

    it("should fail when id is missing", async () => {
      const result = await service.updateCustomer({ name: "Ali", phone: "03001234567" });
      expect(result.success).toBe(false);
    });

    it("should fail when id is 0 (non-positive)", async () => {
      const result = await service.updateCustomer({ ...validInput, id: 0 });
      expect(result.success).toBe(false);
    });
  });

  // ── deleteCustomer ────────────────────────────────────────────────────────
  describe("deleteCustomer()", () => {
    it("should delete customer successfully", async () => {
      mockRepo.delete.mockReturnValue({ success: true });
      const result = await service.deleteCustomer(1);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Customer deleted successfully.");
    });

    it("should return failure when repository delete fails (e.g., has pending sales)", async () => {
      mockRepo.delete.mockReturnValue({ success: false, reason: "Customer has existing sales records." });
      const result = await service.deleteCustomer(1);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Customer has existing sales records.");
    });

    it("should return failure for invalid (non-number) ID", async () => {
      const result = await service.deleteCustomer("abc" as unknown as number);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid customer ID.");
    });

    it("should return failure for ID of 0", async () => {
      const result = await service.deleteCustomer(0);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid customer ID.");
    });
  });
});
