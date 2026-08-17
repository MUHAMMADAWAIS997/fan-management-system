"use server";

import { customerLedgerService } from "@/lib/services/customer_ledger.service";
import { CustomerLedgerEntry, RecordCustomerPaymentInput } from "@/lib/types/customer_ledger";
import { revalidatePath } from "next/cache";

export async function getCustomerLedgerAction(
  customerId: number,
  startDate?: string,
  endDate?: string
): Promise<CustomerLedgerEntry[]> {
  try {
    return await customerLedgerService.getLedgerByCustomerId(customerId, startDate, endDate);
  } catch (error: any) {
    console.error("Failed to fetch customer ledger:", error);
    return [];
  }
}

export async function recordCustomerPaymentAction(
  input: RecordCustomerPaymentInput
): Promise<{ success: boolean; data?: CustomerLedgerEntry; error?: string }> {
  try {
    const entry = await customerLedgerService.recordCustomerPayment(input);
    revalidatePath("/customer-ledger");
    revalidatePath("/customers");
    revalidatePath("/home");
    revalidatePath("/summary");
    return { success: true, data: entry };
  } catch (error: any) {
    console.error("Failed to record customer payment:", error);
    return { success: false, error: error.message || "Failed to record payment." };
  }
}
