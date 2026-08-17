import { z } from "zod";
import { sanitizeInput } from "./auth";

export const productSchema = z.object({
  name: z
    .string()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name must not exceed 100 characters")
    .transform((val) => sanitizeInput(val)),
  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .optional()
    .transform((val) => (val ? sanitizeInput(val) : "")),
  type: z
    .string()
    .min(1, "Product type is required")
    .max(50, "Type must not exceed 50 characters")
    .transform((val) => sanitizeInput(val)),
  size: z
    .string()
    .min(1, "Product size is required")
    .max(50, "Size must not exceed 50 characters")
    .transform((val) => sanitizeInput(val)),
  supplier_id: z.coerce
    .number()
    .int("Supplier ID must be an integer")
    .positive("Please select a valid supplier"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(0, "Quantity cannot be negative"),
  retail_price: z.coerce
    .number()
    .min(0, "Retail price cannot be negative"),
  discount: z.coerce
    .number()
    .min(0, "Discount percentage cannot be negative")
    .max(100, "Discount percentage cannot exceed 100%"),
  status: z
    .enum(["active", "inactive"])
    .default("active")
    .optional(),
});

export const updateProductSchema = productSchema.extend({
  id: z.coerce.number().int().positive("Invalid Product ID"),
});

export type ProductSchemaInput = z.infer<typeof productSchema>;
export type UpdateProductSchemaInput = z.infer<typeof updateProductSchema>;
