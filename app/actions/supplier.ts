"use server";

import { supplierService } from "@/lib/services/supplier.service";
import { Supplier } from "@/lib/types/supplier";
import { ActionResult } from "@/lib/types/auth";
import { revalidatePath } from "next/cache";

export async function fetchSuppliersAction(): Promise<Supplier[]> {
  return supplierService.getSuppliers();
}

export async function createSupplierAction(data: {
  name: string;
  phone: string;
}): Promise<ActionResult<Supplier>> {
  const result = await supplierService.createSupplier(data);
  if (result.success) {
    revalidatePath("/suppliers");
    revalidatePath("/products");
  }
  return result;
}

export async function updateSupplierAction(data: {
  id: number;
  name: string;
  phone: string;
}): Promise<ActionResult<Supplier>> {
  const result = await supplierService.updateSupplier(data);
  if (result.success) {
    revalidatePath("/suppliers");
    revalidatePath("/products");
  }
  return result;
}

export async function deleteSupplierAction(id: number): Promise<ActionResult> {
  const result = await supplierService.deleteSupplier(id);
  if (result.success) {
    revalidatePath("/suppliers");
    revalidatePath("/products");
  }
  return result;
}
