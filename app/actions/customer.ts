"use server";

import { customerService } from "@/lib/services/customer.service";
import { Customer } from "@/lib/types/customer";
import { ActionResult } from "@/lib/types/auth";
import { revalidatePath } from "next/cache";

export async function fetchCustomersAction(): Promise<Customer[]> {
  return customerService.getCustomers();
}

export async function createCustomerAction(data: {
  name: string;
  phone: string;
  location?: string;
}): Promise<ActionResult<Customer>> {
  const result = await customerService.createCustomer(data);
  if (result.success) {
    revalidatePath("/customers");
  }
  return result;
}

export async function updateCustomerAction(data: {
  id: number;
  name: string;
  phone: string;
  location?: string;
}): Promise<ActionResult<Customer>> {
  const result = await customerService.updateCustomer(data);
  if (result.success) {
    revalidatePath("/customers");
  }
  return result;
}

export async function deleteCustomerAction(id: number): Promise<ActionResult> {
  const result = await customerService.deleteCustomer(id);
  if (result.success) {
    revalidatePath("/customers");
  }
  return result;
}
