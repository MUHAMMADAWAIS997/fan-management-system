import { z } from "zod";

export const stockItemSchema = z.object({
  product_id: z.coerce
    .number()
    .int("Product ID must be an integer")
    .positive("Please select a product for every row."),
  
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),

  unit_retail_price: z.coerce
    .number()
    .min(0, "Unit retail price cannot be negative"),

  unit_discount_percent: z.coerce
    .number()
    .min(0, "Discount percentage cannot be negative")
    .max(100, "Discount percentage cannot exceed 100%"),
});

export const receiveMultiStockSchema = z.object({
  company_id: z.coerce
    .number()
    .int("Company ID must be an integer")
    .positive("Please select a supplier/company"),

  purchase_date: z
    .string()
    .min(1, "Purchase date is required"),
  
  invoice_number: z
    .string()
    .min(1, "Invoice number is required"),

  payment_status: z.enum(["paid", "partial", "unpaid"]),

  paid_amount: z.coerce
    .number()
    .min(0, "Paid amount cannot be negative"),

  items: z
    .array(stockItemSchema)
    .min(1, "At least one product item must be included in the batch."),
});

export type ReceiveMultiStockSchemaType = z.infer<typeof receiveMultiStockSchema>;
