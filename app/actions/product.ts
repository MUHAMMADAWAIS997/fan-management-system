"use server";

import { productService } from "@/lib/services/product.service";
import { Product } from "@/lib/types/product";
import { ActionResult } from "@/lib/types/auth";
import { revalidatePath } from "next/cache";

export async function fetchProductsAction(): Promise<Product[]> {
  return productService.getProducts();
}

export async function createProductAction(data: {
  name: string;
  description?: string;
  type: string;
  size: string;
  supplier_id: number;
  quantity: number;
  retail_price: number;
  discount: number;
  status?: string;
}): Promise<ActionResult<Product>> {
  const result = await productService.createProduct(data);
  if (result.success) {
    revalidatePath("/products");
  }
  return result;
}

export async function updateProductAction(data: {
  id: number;
  name: string;
  description?: string;
  type: string;
  size: string;
  supplier_id: number;
  quantity: number;
  retail_price: number;
  discount: number;
  status?: string;
}): Promise<ActionResult<Product>> {
  const result = await productService.updateProduct(data);
  if (result.success) {
    revalidatePath("/products");
  }
  return result;
}

export async function deleteProductAction(id: number): Promise<ActionResult> {
  const result = await productService.deleteProduct(id);
  if (result.success) {
    revalidatePath("/products");
  }
  return result;
}

export async function toggleProductStatusAction(
  id: number,
  status: string
): Promise<ActionResult<Product>> {
  const result = await productService.toggleProductStatus(id, status);
  if (result.success) {
    revalidatePath("/products");
  }
  return result;
}

export async function getProductHistoryAction(id: number, startDate?: string, endDate?: string) {
  return productService.getProductHistory(id, startDate, endDate);
}
