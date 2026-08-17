"use server";

import { stockService } from "@/lib/services/stock.service";
import { authService } from "@/lib/services/auth.service";
import { revalidatePath } from "next/cache";
import { StockBatchSummary } from "@/lib/types/stock";
import { ActionResult } from "@/lib/types/auth";

export async function receiveStockAction(
  input: unknown
): Promise<ActionResult<StockBatchSummary>> {
  const user = await authService.getCurrentSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized. Please log in." };
  }

  const result = await stockService.receiveMultiStock(input);

  if (result.success) {
    revalidatePath("/receive-stock");
    revalidatePath("/products");
    revalidatePath("/available-stock");
    revalidatePath("/home");
    revalidatePath("/summary");
  }

  return result;
}

export async function getStockBatchesAction(startDate?: string, endDate?: string): Promise<StockBatchSummary[]> {
  try {
    return await stockService.getStockBatches(startDate, endDate);
  } catch (error: any) {
    console.error("Failed to fetch stock batches:", error);
    return [];
  }
}
