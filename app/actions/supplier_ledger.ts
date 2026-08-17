"use server";

import { supplierLedgerService } from "@/lib/services/supplier_ledger.service";
import { RecordSupplierPaymentInput, SupplierLedgerEntry } from "@/lib/types/supplier_ledger";
import { ActionResult } from "@/lib/types/auth";
import { revalidatePath } from "next/cache";

export async function recordSupplierPaymentAction(
  input: RecordSupplierPaymentInput
): Promise<ActionResult<SupplierLedgerEntry>> {
  const result = await supplierLedgerService.recordSupplierPayment(input);
  if (result.success) {
    revalidatePath("/supplier-ledger");
    revalidatePath("/expenses");
    revalidatePath("/home");
    revalidatePath("/summary");
  }
  return result;
}

export async function getSupplierLedgerAction(supplierId: number, startDate?: string, endDate?: string) {
  return supplierLedgerService.getSupplierLedger(supplierId, startDate, endDate);
}
