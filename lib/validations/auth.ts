import { z } from "zod";

/**
 * Sanitizes input string to prevent unwanted dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .replace(/[\0\x08\x09\x1a\n\r"'\\%]/g, ""); // strip null bytes and escape characters
}

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username must not exceed 50 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain alphanumeric characters, underscores, hyphens, and dots")
    .transform((val) => sanitizeInput(val)),
  password: z
    .string()
    .min(4, "Password must be at least 4 characters")
    .max(100, "Password must not exceed 100 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
