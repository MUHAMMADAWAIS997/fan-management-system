"use server";

import { saleService } from "@/lib/services/sale.service";
import { CreateSaleInput, Sale } from "@/lib/types/sale";
import { revalidatePath } from "next/cache";

export async function getAllSalesAction(startDate?: string, endDate?: string): Promise<Sale[]> {
  try {
    return await saleService.getAllSales(startDate, endDate);
  } catch (error: any) {
    console.error("Failed to fetch sales:", error);
    return [];
  }
}

export async function getSaleByIdAction(id: number): Promise<Sale | null> {
  try {
    return await saleService.getSaleById(id);
  } catch (error: any) {
    console.error("Failed to fetch sale by id:", error);
    return null;
  }
}

export async function recordSaleAction(
  input: CreateSaleInput
): Promise<{ success: boolean; data?: Sale; error?: string }> {
  try {
    const sale = await saleService.recordSale(input);
    revalidatePath("/sales");
    revalidatePath("/available-stock");
    revalidatePath("/products");
    revalidatePath("/customer-ledger");
    revalidatePath("/home");
    revalidatePath("/summary");
    return { success: true, data: sale };
  } catch (error: any) {
    console.error("Failed to record sale:", error);
    return { success: false, error: error.message || "Failed to record sale." };
  }
}
