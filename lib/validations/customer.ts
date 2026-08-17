import { z } from "zod";
import { sanitizeInput } from "./auth";

export const customerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .transform((val) => sanitizeInput(val)),
  phone: z
    .string()
    .min(5, "Phone number must be at least 5 digits")
    .max(25, "Phone number must not exceed 25 characters")
    .transform((val) => sanitizeInput(val)),
  location: z
    .string()
    .max(150, "Location must not exceed 150 characters")
    .optional()
    .transform((val) => (val ? sanitizeInput(val) : "")),
});

export const updateCustomerSchema = customerSchema.extend({
  id: z.number().int().positive("Invalid Customer ID"),
});

export type CustomerSchemaInput = z.infer<typeof customerSchema>;
export type UpdateCustomerSchemaInput = z.infer<typeof updateCustomerSchema>;
