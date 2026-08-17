import { z } from "zod";
import { sanitizeInput } from "./auth";

export const supplierSchema = z.object({
  name: z
    .string()
    .min(2, "Supplier name must be at least 2 characters")
    .max(100, "Supplier name must not exceed 100 characters")
    .transform((val) => sanitizeInput(val)),
  phone: z
    .string()
    .min(5, "Phone number must be at least 5 digits")
    .max(25, "Phone number must not exceed 25 characters")
    .transform((val) => sanitizeInput(val)),
});

export const updateSupplierSchema = supplierSchema.extend({
  id: z.coerce.number().int().positive("Invalid Supplier ID"),
});

export type SupplierSchemaInput = z.infer<typeof supplierSchema>;
export type UpdateSupplierSchemaInput = z.infer<typeof updateSupplierSchema>;
