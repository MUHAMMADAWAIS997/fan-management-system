/**
 * Unit tests for Zod validation schemas
 * Tests cover: customerSchema, productSchema, createSaleSchema,
 *              receiveMultiStockSchema, loginSchema, supplierSchema
 */

import { customerSchema, updateCustomerSchema } from "@/lib/validations/customer";
import { productSchema, updateProductSchema } from "@/lib/validations/product";
import { createSaleSchema, createSaleItemSchema } from "@/lib/validations/sale";
import { receiveMultiStockSchema, stockItemSchema } from "@/lib/validations/stock";
import { loginSchema, sanitizeInput } from "@/lib/validations/auth";
import { supplierSchema, updateSupplierSchema } from "@/lib/validations/supplier";

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeInput
// ─────────────────────────────────────────────────────────────────────────────
describe("sanitizeInput()", () => {
  it("should trim leading and trailing whitespace", () =>
    expect(sanitizeInput("  hello  ")).toBe("hello"));

  it("should strip single quotes", () =>
    expect(sanitizeInput("O'Brien")).toBe("OBrien"));

  it("should strip double quotes", () =>
    expect(sanitizeInput('"quoted"')).toBe("quoted"));

  it("should strip backslash", () =>
    expect(sanitizeInput("path\\to\\file")).toBe("pathtofile"));

  it("should strip null byte", () =>
    expect(sanitizeInput("hello\0world")).toBe("helloworld"));

  it("should return empty string for non-string input", () =>
    expect(sanitizeInput(123 as unknown as string)).toBe(""));
});

// ─────────────────────────────────────────────────────────────────────────────
// loginSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("loginSchema", () => {
  it("should pass for valid credentials", () => {
    expect(loginSchema.safeParse({ username: "admin", password: "pass123" }).success).toBe(true);
  });

  it("should fail for username shorter than 3 chars", () =>
    expect(loginSchema.safeParse({ username: "ab", password: "pass123" }).success).toBe(false));

  it("should fail for username with special characters", () =>
    expect(loginSchema.safeParse({ username: "admin!", password: "pass" }).success).toBe(false));

  it("should fail for password shorter than 4 chars", () =>
    expect(loginSchema.safeParse({ username: "admin", password: "ab" }).success).toBe(false));

  it("should fail for empty username", () =>
    expect(loginSchema.safeParse({ username: "", password: "password" }).success).toBe(false));

  it("should fail for empty password", () =>
    expect(loginSchema.safeParse({ username: "admin", password: "" }).success).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// customerSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("customerSchema", () => {
  const valid = { name: "Ali Khan", phone: "03001234567" };

  it("should pass with valid name and phone", () =>
    expect(customerSchema.safeParse(valid).success).toBe(true));

  it("should pass with optional location", () =>
    expect(customerSchema.safeParse({ ...valid, location: "Lahore" }).success).toBe(true));

  it("should fail when name is less than 2 chars", () =>
    expect(customerSchema.safeParse({ ...valid, name: "A" }).success).toBe(false));

  it("should fail when name exceeds 100 chars", () =>
    expect(customerSchema.safeParse({ ...valid, name: "A".repeat(101) }).success).toBe(false));

  it("should fail when phone is less than 5 chars", () =>
    expect(customerSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false));

  it("should sanitize name (strip quotes)", () => {
    const result = customerSchema.safeParse({ ...valid, name: "Ali 'Khan'" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).not.toContain("'");
  });
});

describe("updateCustomerSchema", () => {
  const valid = { id: 1, name: "Ali Khan", phone: "03001234567" };

  it("should pass with valid id and data", () =>
    expect(updateCustomerSchema.safeParse(valid).success).toBe(true));

  it("should fail when id is 0", () =>
    expect(updateCustomerSchema.safeParse({ ...valid, id: 0 }).success).toBe(false));

  it("should fail when id is negative", () =>
    expect(updateCustomerSchema.safeParse({ ...valid, id: -1 }).success).toBe(false));

  it("should fail when id is missing", () =>
    expect(updateCustomerSchema.safeParse({ name: "Ali", phone: "03001234567" }).success).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// supplierSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("supplierSchema", () => {
  const valid = { name: "GFC Fans", phone: "042-1234567" };

  it("should pass with valid data", () =>
    expect(supplierSchema.safeParse(valid).success).toBe(true));

  it("should fail for name less than 2 chars", () =>
    expect(supplierSchema.safeParse({ ...valid, name: "X" }).success).toBe(false));

  it("should fail for phone less than 5 chars", () =>
    expect(supplierSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false));
});

describe("updateSupplierSchema", () => {
  it("should pass with valid id", () =>
    expect(updateSupplierSchema.safeParse({ id: 1, name: "GFC", phone: "12345" }).success).toBe(true));

  it("should fail when id is 0", () =>
    expect(updateSupplierSchema.safeParse({ id: 0, name: "GFC", phone: "12345" }).success).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// productSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("productSchema", () => {
  const valid = {
    name: "Ceiling Fan 56\"",
    type: "Ceiling",
    size: "56\"",
    supplier_id: 1,
    quantity: 0,
    retail_price: 5000,
    discount: 10,
    status: "active",
  };

  it("should pass with fully valid data", () =>
    expect(productSchema.safeParse(valid).success).toBe(true));

  it("should fail when name is less than 2 chars", () =>
    expect(productSchema.safeParse({ ...valid, name: "X" }).success).toBe(false));

  it("should fail when type is empty", () =>
    expect(productSchema.safeParse({ ...valid, type: "" }).success).toBe(false));

  it("should fail when size is empty", () =>
    expect(productSchema.safeParse({ ...valid, size: "" }).success).toBe(false));

  it("should fail when supplier_id is 0", () =>
    expect(productSchema.safeParse({ ...valid, supplier_id: 0 }).success).toBe(false));

  it("should fail when quantity is negative", () =>
    expect(productSchema.safeParse({ ...valid, quantity: -1 }).success).toBe(false));

  it("should fail when retail_price is negative", () =>
    expect(productSchema.safeParse({ ...valid, retail_price: -100 }).success).toBe(false));

  it("should fail when discount exceeds 100", () =>
    expect(productSchema.safeParse({ ...valid, discount: 101 }).success).toBe(false));

  it("should fail for invalid status value", () =>
    expect(productSchema.safeParse({ ...valid, status: "pending" }).success).toBe(false));

  it("should coerce string numbers to numbers", () => {
    const result = productSchema.safeParse({ ...valid, quantity: "10", retail_price: "5000", discount: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(10);
      expect(result.data.retail_price).toBe(5000);
    }
  });
});

describe("updateProductSchema", () => {
  const valid = {
    id: 1,
    name: "Ceiling Fan",
    type: "Ceiling",
    size: "56\"",
    supplier_id: 1,
    quantity: 0,
    retail_price: 5000,
    discount: 10,
  };

  it("should pass with valid id", () =>
    expect(updateProductSchema.safeParse(valid).success).toBe(true));

  it("should fail when id is missing", () =>
    expect(updateProductSchema.safeParse({ ...valid, id: undefined }).success).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// createSaleItemSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("createSaleItemSchema", () => {
  const validItem = { product_id: 1, quantity: 2, unit_retail_price: 5000, unit_discount_percent: 10 };

  it("should pass for valid item", () =>
    expect(createSaleItemSchema.safeParse(validItem).success).toBe(true));

  it("should fail for product_id = 0", () =>
    expect(createSaleItemSchema.safeParse({ ...validItem, product_id: 0 }).success).toBe(false));

  it("should fail for quantity = 0", () =>
    expect(createSaleItemSchema.safeParse({ ...validItem, quantity: 0 }).success).toBe(false));

  it("should fail for negative unit_retail_price", () =>
    expect(createSaleItemSchema.safeParse({ ...validItem, unit_retail_price: -1 }).success).toBe(false));

  it("should fail for discount > 100%", () =>
    expect(createSaleItemSchema.safeParse({ ...validItem, unit_discount_percent: 101 }).success).toBe(false));

  it("should fail for negative discount", () =>
    expect(createSaleItemSchema.safeParse({ ...validItem, unit_discount_percent: -5 }).success).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// createSaleSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("createSaleSchema", () => {
  const validSale = {
    customer_name: "Walk-in",
    sale_date: "2024-01-20",
    invoice_number: "SI-001",
    payment_status: "paid",
    paid_amount: 4500,
    items: [{ product_id: 1, quantity: 1, unit_retail_price: 5000, unit_discount_percent: 10 }],
  };

  it("should pass for a fully valid sale", () =>
    expect(createSaleSchema.safeParse(validSale).success).toBe(true));

  it("should fail when customer_name is empty", () =>
    expect(createSaleSchema.safeParse({ ...validSale, customer_name: "" }).success).toBe(false));

  it("should fail when items array is empty", () =>
    expect(createSaleSchema.safeParse({ ...validSale, items: [] }).success).toBe(false));

  it("should fail for invalid payment_status", () =>
    expect(createSaleSchema.safeParse({ ...validSale, payment_status: "overdraft" }).success).toBe(false));

  it("should fail when invoice_number is empty", () =>
    expect(createSaleSchema.safeParse({ ...validSale, invoice_number: "" }).success).toBe(false));

  it("should fail when paid_amount is negative", () =>
    expect(createSaleSchema.safeParse({ ...validSale, paid_amount: -1 }).success).toBe(false));

  it("should accept all valid payment_status values", () => {
    for (const status of ["paid", "partial", "unpaid"]) {
      expect(createSaleSchema.safeParse({ ...validSale, payment_status: status }).success).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// stockItemSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("stockItemSchema", () => {
  const validItem = { product_id: 1, quantity: 5, unit_retail_price: 5000, unit_discount_percent: 10 };

  it("should pass for a valid item", () =>
    expect(stockItemSchema.safeParse(validItem).success).toBe(true));

  it("should fail for product_id = 0", () =>
    expect(stockItemSchema.safeParse({ ...validItem, product_id: 0 }).success).toBe(false));

  it("should fail for quantity = 0", () =>
    expect(stockItemSchema.safeParse({ ...validItem, quantity: 0 }).success).toBe(false));

  it("should fail for negative unit_retail_price", () =>
    expect(stockItemSchema.safeParse({ ...validItem, unit_retail_price: -1 }).success).toBe(false));

  it("should fail for discount_percent > 100", () =>
    expect(stockItemSchema.safeParse({ ...validItem, unit_discount_percent: 101 }).success).toBe(false));
});

// ─────────────────────────────────────────────────────────────────────────────
// receiveMultiStockSchema
// ─────────────────────────────────────────────────────────────────────────────
describe("receiveMultiStockSchema", () => {
  const validBatch = {
    company_id: 1,
    purchase_date: "2024-01-15",
    invoice_number: "PO-001",
    payment_status: "paid",
    paid_amount: 45000,
    items: [{ product_id: 1, quantity: 10, unit_retail_price: 5000, unit_discount_percent: 10 }],
  };

  it("should pass for valid batch input", () =>
    expect(receiveMultiStockSchema.safeParse(validBatch).success).toBe(true));

  it("should fail when company_id is 0", () =>
    expect(receiveMultiStockSchema.safeParse({ ...validBatch, company_id: 0 }).success).toBe(false));

  it("should fail when purchase_date is empty", () =>
    expect(receiveMultiStockSchema.safeParse({ ...validBatch, purchase_date: "" }).success).toBe(false));

  it("should fail when invoice_number is empty", () =>
    expect(receiveMultiStockSchema.safeParse({ ...validBatch, invoice_number: "" }).success).toBe(false));

  it("should fail for invalid payment_status", () =>
    expect(receiveMultiStockSchema.safeParse({ ...validBatch, payment_status: "credit" }).success).toBe(false));

  it("should fail for negative paid_amount", () =>
    expect(receiveMultiStockSchema.safeParse({ ...validBatch, paid_amount: -1 }).success).toBe(false));

  it("should fail when items array is empty", () =>
    expect(receiveMultiStockSchema.safeParse({ ...validBatch, items: [] }).success).toBe(false));
});
