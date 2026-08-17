/**
 * Unit tests for client-side validation helpers (lib/validations/helpers.ts)
 * These are pure functions — no mocks needed.
 */

import {
  isEmptyOrWhitespace,
  validateRequiredText,
  validateName,
  validatePhone,
  validateNumeric,
  validatePercentage,
  validateDropdown,
  validateDate,
} from "@/lib/validations/helpers";

describe("Validation Helpers", () => {
  // ── isEmptyOrWhitespace ───────────────────────────────────────────────────
  describe("isEmptyOrWhitespace()", () => {
    it("returns true for empty string", () => expect(isEmptyOrWhitespace("")).toBe(true));
    it("returns true for whitespace-only string", () => expect(isEmptyOrWhitespace("   ")).toBe(true));
    it("returns true for null", () => expect(isEmptyOrWhitespace(null)).toBe(true));
    it("returns true for undefined", () => expect(isEmptyOrWhitespace(undefined)).toBe(true));
    it("returns false for a normal string", () => expect(isEmptyOrWhitespace("hello")).toBe(false));
    it("returns false for a string with leading/trailing spaces but content", () =>
      expect(isEmptyOrWhitespace("  hi  ")).toBe(false));
  });

  // ── validateRequiredText ──────────────────────────────────────────────────
  describe("validateRequiredText()", () => {
    it("returns null for valid non-empty text", () =>
      expect(validateRequiredText("Hello", "Field")).toBeNull());

    it("returns error message for empty string", () => {
      const result = validateRequiredText("", "Name");
      expect(result).toContain("required");
    });

    it("returns error for text shorter than minLength", () => {
      const result = validateRequiredText("A", "Name", 3);
      expect(result).toContain("3 characters");
    });

    it("returns null when text exactly meets minLength", () => {
      expect(validateRequiredText("Ali", "Name", 3)).toBeNull();
    });

    it("returns null for whitespace-padded value that meets minLength after trim", () => {
      // "  A  ".trim() = "A" which is 1 char, minLength defaults to 1 → pass
      expect(validateRequiredText("  A  ", "Field", 1)).toBeNull();
    });
  });

  // ── validateName ──────────────────────────────────────────────────────────
  describe("validateName()", () => {
    it("returns null for a valid name", () =>
      expect(validateName("Ali Khan", "Customer")).toBeNull());

    it("returns error for a purely numeric name", () =>
      expect(validateName("12345", "Customer")).toContain("numbers only"));

    it("returns error for empty name", () => {
      const result = validateName("", "Customer");
      expect(result).not.toBeNull();
    });

    it("returns error for single-char name (minLength=2)", () =>
      expect(validateName("A", "Customer")).not.toBeNull());

    it("returns null for a name with numbers mixed in", () =>
      expect(validateName("Model56Fan", "Product")).toBeNull());
  });

  // ── validatePhone ─────────────────────────────────────────────────────────
  describe("validatePhone()", () => {
    it("returns null for a valid phone number", () =>
      expect(validatePhone("03001234567")).toBeNull());

    it("returns null for international format with +", () =>
      expect(validatePhone("+92 300 1234567")).toBeNull());

    it("returns null for phone with dashes and parentheses", () =>
      expect(validatePhone("(042) 123-4567")).toBeNull());

    it("returns error for phone with letters", () =>
      expect(validatePhone("03001ABC567")).not.toBeNull());

    it("returns error for phone with fewer than 5 digits", () =>
      expect(validatePhone("1234")).not.toBeNull());

    it("returns error for empty phone when required=true", () =>
      expect(validatePhone("", "Phone", true)).toContain("required"));

    it("returns null for empty phone when required=false", () =>
      expect(validatePhone("", "Phone", false)).toBeNull());
  });

  // ── validateNumeric ───────────────────────────────────────────────────────
  describe("validateNumeric()", () => {
    it("returns null for a valid positive integer", () =>
      expect(validateNumeric(100, "Quantity")).toBeNull());

    it("returns null for a valid decimal", () =>
      expect(validateNumeric("4500.50", "Price")).toBeNull());

    it("returns error for a string value when integerOnly=true", () =>
      expect(validateNumeric("12.5", "Quantity", { integerOnly: true })).not.toBeNull());

    it("returns error when value is below min", () =>
      expect(validateNumeric(-5, "Price", { min: 0 })).toContain("negative"));

    it("returns error when value exceeds max", () =>
      expect(validateNumeric(150, "Discount", { max: 100 })).toContain("exceed 100"));

    it("returns null for value exactly at min boundary", () =>
      expect(validateNumeric(0, "Price", { min: 0 })).toBeNull());

    it("returns null for value exactly at max boundary", () =>
      expect(validateNumeric(100, "Discount", { max: 100 })).toBeNull());

    it("returns error for non-numeric string", () =>
      expect(validateNumeric("abc", "Price")).not.toBeNull());

    it("returns error for empty value when required=true", () =>
      expect(validateNumeric("", "Price", { isRequired: true })).not.toBeNull());

    it("returns null for empty value when required=false", () =>
      expect(validateNumeric("", "Price", { isRequired: false })).toBeNull());
  });

  // ── validatePercentage ────────────────────────────────────────────────────
  describe("validatePercentage()", () => {
    it("returns null for 0%", () => expect(validatePercentage(0)).toBeNull());
    it("returns null for 50%", () => expect(validatePercentage(50)).toBeNull());
    it("returns null for 100%", () => expect(validatePercentage(100)).toBeNull());
    it("returns error for negative percentage", () =>
      expect(validatePercentage(-1)).not.toBeNull());
    it("returns error for percentage above 100", () =>
      expect(validatePercentage(101)).not.toBeNull());
    it("returns null for decimal percentage like 12.5", () =>
      expect(validatePercentage(12.5)).toBeNull());
    it("returns error for empty when required", () =>
      expect(validatePercentage("", "Discount", true)).not.toBeNull());
    it("returns null for empty when not required", () =>
      expect(validatePercentage("", "Discount", false)).toBeNull());
  });

  // ── validateDropdown ──────────────────────────────────────────────────────
  describe("validateDropdown()", () => {
    it("returns null for a valid non-zero numeric id", () =>
      expect(validateDropdown(1, "Supplier")).toBeNull());

    it("returns null for a valid string value", () =>
      expect(validateDropdown("active", "Status")).toBeNull());

    it("returns error for null", () =>
      expect(validateDropdown(null, "Supplier")).not.toBeNull());

    it("returns error for undefined", () =>
      expect(validateDropdown(undefined, "Supplier")).not.toBeNull());

    it("returns error for empty string", () =>
      expect(validateDropdown("", "Supplier")).not.toBeNull());

    it("returns error for the string '0'", () =>
      expect(validateDropdown("0", "Supplier")).not.toBeNull());

    it("returns error for placeholder-style values like 'select supplier'", () =>
      expect(validateDropdown("select supplier", "Supplier")).not.toBeNull());
  });

  // ── validateDate ──────────────────────────────────────────────────────────
  describe("validateDate()", () => {
    it("returns null for a valid ISO date string", () =>
      expect(validateDate("2024-01-15")).toBeNull());

    it("returns error for empty date when required", () =>
      expect(validateDate("")).toContain("required"));

    it("returns null for empty date when not required", () =>
      expect(validateDate("", "Date", { isRequired: false })).toBeNull());

    it("returns error for an invalid date string", () =>
      expect(validateDate("not-a-date")).toContain("Invalid"));

    it("returns error for future date when noFuture=true", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = validateDate(futureDate.toISOString().split("T")[0], "Date", { noFuture: true });
      expect(result).toContain("future");
    });

    it("returns null for today's date when noFuture=true", () => {
      const today = new Date().toISOString().split("T")[0];
      expect(validateDate(today, "Date", { noFuture: true })).toBeNull();
    });

    it("returns null for past date when noFuture=true", () =>
      expect(validateDate("2020-06-15", "Date", { noFuture: true })).toBeNull());
  });
});
