import { z } from "zod";

export const createSaleItemSchema = z.object({
  product_id: z.coerce.number().int().positive("Product selection is required."),
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
  unit_retail_price: z.coerce.number().min(0, "Retail price cannot be negative."),
  unit_discount_percent: z.coerce
    .number()
    .min(0, "Discount cannot be negative.")
    .max(100, "Discount percentage cannot exceed 100%."),
});

export const createSaleSchema = z.object({
  customer_id: z.coerce.number().int().positive().nullable().optional(),
  customer_name: z.string().min(1, "Customer name is required."),
  customer_phone: z.string().optional(),
  sale_date: z.string().min(1, "Sale date is required."),
  invoice_number: z.string().min(1, "Invoice number is required."),
  payment_status: z.enum(["paid", "partial", "unpaid"]),
  paid_amount: z.coerce.number().min(0, "Paid amount cannot be negative."),
  shop_name: z.string().optional(),
  shop_tagline: z.string().optional(),
  shop_phone: z.string().optional(),
  shop_address: z.string().optional(),
  items: z.array(createSaleItemSchema).min(1, "At least one product item is required."),
});

export const recordCustomerPaymentSchema = z.object({
  customer_id: z.coerce.number().int().positive("Customer selection is required."),
  date: z.string().min(1, "Payment date is required."),
  amount: z.coerce.number().positive("Payment amount must be greater than 0."),
  description: z.string().optional(),
  reference_id: z.string().optional(),
});
