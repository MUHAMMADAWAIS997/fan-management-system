/**
 * Standardized client-side validation utilities for FIMS application
 */

/**
 * Check if string is empty or contains only whitespace
 */
export function isEmptyOrWhitespace(val: string | null | undefined): boolean {
  if (val === null || val === undefined) return true;
  return val.trim().length === 0;
}

/**
 * Validate required text field (trims whitespace, enforces min length)
 */
export function validateRequiredText(
  val: string,
  fieldName: string,
  minLength: number = 1
): string | null {
  if (isEmptyOrWhitespace(val)) {
    return `${fieldName} is required.`;
  }
  const trimmed = val.trim();
  if (trimmed.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters.`;
  }
  return null;
}

/**
 * Validate name fields (prevents pure numeric strings, min length)
 */
export function validateName(
  val: string,
  fieldName: string,
  minLength: number = 2
): string | null {
  const reqErr = validateRequiredText(val, fieldName, minLength);
  if (reqErr) return reqErr;

  const trimmed = val.trim();
  if (/^\d+$/.test(trimmed)) {
    return `${fieldName} cannot consist of numbers only.`;
  }
  return null;
}

/**
 * Validate phone number (allows valid digits, +, -, spaces, min 5 chars)
 */
export function validatePhone(
  val: string,
  fieldName: string = "Phone number",
  isRequired: boolean = true
): string | null {
  if (isEmptyOrWhitespace(val)) {
    return isRequired ? `${fieldName} is required.` : null;
  }
  const trimmed = val.trim();
  // Allowed phone chars: digits, spaces, +, -, (, )
  if (!/^[0-9+\-\s()]+$/.test(trimmed)) {
    return `${fieldName} must contain valid phone digits only.`;
  }
  const digitCount = (trimmed.match(/\d/g) || []).length;
  if (digitCount < 5) {
    return `${fieldName} must contain at least 5 digits.`;
  }
  return null;
}

/**
 * Validate numeric inputs (integers or decimals, min/max bounds)
 */
export function validateNumeric(
  val: string | number,
  fieldName: string,
  opts?: {
    min?: number;
    max?: number;
    integerOnly?: boolean;
    isRequired?: boolean;
  }
): string | null {
  const { min, max, integerOnly = false, isRequired = true } = opts || {};
  const strVal = String(val ?? "").trim();

  if (isEmptyOrWhitespace(strVal)) {
    return isRequired ? `${fieldName} is required.` : null;
  }

  if (integerOnly) {
    if (!/^-?\d+$/.test(strVal)) {
      return `${fieldName} must be a valid whole number.`;
    }
  } else {
    if (!/^-?\d*(\.\d+)?$/.test(strVal) || strVal === ".") {
      return `${fieldName} must be a valid numeric value.`;
    }
  }

  const num = Number(strVal);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number.`;
  }

  if (min !== undefined && num < min) {
    if (min === 0) {
      return `${fieldName} cannot be negative.`;
    }
    return `${fieldName} must be at least ${min}.`;
  }

  if (max !== undefined && num > max) {
    return `${fieldName} cannot exceed ${max}.`;
  }

  return null;
}

/**
 * Validate percentage/discount input (0 to 100 range)
 */
export function validatePercentage(
  val: string | number,
  fieldName: string = "Discount",
  isRequired: boolean = true
): string | null {
  const strVal = String(val ?? "").trim();
  if (isEmptyOrWhitespace(strVal)) {
    return isRequired ? `${fieldName} is required.` : null;
  }

  return validateNumeric(strVal, fieldName, {
    min: 0,
    max: 100,
    isRequired,
  });
}

/**
 * Validate dropdown select (must not be empty, 0, or unselected placeholder)
 */
export function validateDropdown(
  val: string | number | null | undefined,
  fieldName: string
): string | null {
  if (val === null || val === undefined) {
    return `Please select a valid ${fieldName.toLowerCase()}.`;
  }
  const strVal = String(val).trim();
  if (strVal === "" || strVal === "0" || strVal.toLowerCase().includes("select")) {
    return `Please select a valid ${fieldName.toLowerCase()}.`;
  }
  return null;
}

/**
 * Validate date field
 */
export function validateDate(
  val: string,
  fieldName: string = "Date",
  opts?: { isRequired?: boolean; noFuture?: boolean }
): string | null {
  const { isRequired = true, noFuture = false } = opts || {};
  if (isEmptyOrWhitespace(val)) {
    return isRequired ? `${fieldName} is required.` : null;
  }
  const dateObj = new Date(val);
  if (isNaN(dateObj.getTime())) {
    return `Invalid ${fieldName.toLowerCase()} format.`;
  }

  if (noFuture) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dateObj > today) {
      return `${fieldName} cannot be in the future.`;
    }
  }

  return null;
}

/**
 * Helper to automatically focus the first element with an error in a form
 */
export function focusFirstInvalidInput(formElement?: HTMLFormElement | null): void {
  if (typeof window === "undefined") return;
  setTimeout(() => {
    const targetForm = formElement || document.querySelector("form");
    if (!targetForm) return;
    const firstErrorElem = targetForm.querySelector<HTMLElement>(
      "input.border-red-500, input.border-\\[\\#ba1a1a\\], select.border-red-500, textarea.border-red-500, [aria-invalid='true']"
    );
    if (firstErrorElem) {
      firstErrorElem.focus();
    }
  }, 50);
}
