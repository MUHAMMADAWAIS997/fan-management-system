import { productRepository } from "@/lib/repositories/product.repository";
import { supplierRepository } from "@/lib/repositories/supplier.repository";
import { productSchema, updateProductSchema } from "@/lib/validations/product";
import { Product } from "@/lib/types/product";
import { ActionResult } from "@/lib/types/auth";
import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export class ProductService {
  /**
   * Get all registered products
   */
  public async getProducts(): Promise<Product[]> {
    return productRepository.getAll();
  }

  /**
   * Get all active registered products
   */
  public async getActiveProducts(): Promise<Product[]> {
    return productRepository.getActiveOnly();
  }

  /**
   * Get single product by ID
   */
  public async getProductById(id: number): Promise<Product | undefined> {
    return productRepository.getById(id);
  }

  /**
   * Calculate cost & discount amount based on retail price and discount percentage
   */
  public calculateCost(
    retailPrice: number,
    discountPercent: number
  ): { discountAmount: number; cost: number } {
    const discountAmount = Number((retailPrice * (discountPercent / 100)).toFixed(2));
    const cost = Number(Math.max(0, retailPrice * (1 - discountPercent / 100)).toFixed(2));
    return { discountAmount, cost };
  }

  /**
   * Create product with calculated cost and supplier verification
   */
  public async createProduct(input: unknown): Promise<ActionResult<Product>> {
    const validation = productSchema.safeParse(input);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        message: "Invalid product data provided.",
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const data = validation.data;

    // Verify supplier exists
    const supplier = supplierRepository.getById(data.supplier_id);
    if (!supplier) {
      return {
        success: false,
        message: "Selected supplier does not exist.",
        errors: { supplier_id: ["Invalid supplier selection."] },
      };
    }

    // Auto-calculate cost & discount amount from discount percentage
    const { discountAmount, cost } = this.calculateCost(data.retail_price, data.discount);

    const newProduct = productRepository.create({
      ...data,
      discount: discountAmount,
      cost,
    });

    return {
      success: true,
      message: "Product added successfully.",
      data: newProduct,
    };
  }

  /**
   * Update product with calculated cost
   */
  public async updateProduct(input: unknown): Promise<ActionResult<Product>> {
    const validation = updateProductSchema.safeParse(input);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        message: "Invalid product data provided.",
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const data = validation.data;

    // Verify supplier exists
    const supplier = supplierRepository.getById(data.supplier_id);
    if (!supplier) {
      return {
        success: false,
        message: "Selected supplier does not exist.",
        errors: { supplier_id: ["Invalid supplier selection."] },
      };
    }

    // Auto-calculate cost & discount amount from discount percentage
    const { discountAmount, cost } = this.calculateCost(data.retail_price, data.discount);

    const updated = productRepository.update({
      ...data,
      discount: discountAmount,
      cost,
    });

    if (!updated) {
      return {
        success: false,
        message: "Product not found.",
      };
    }

    return {
      success: true,
      message: "Product updated successfully.",
      data: updated,
    };
  }

  /**
   * Toggle product status (active <-> inactive)
   */
  public async toggleProductStatus(id: number, status: string): Promise<ActionResult<Product>> {
    if (!id || typeof id !== "number") {
      return { success: false, message: "Invalid product ID." };
    }
    const updated = productRepository.toggleStatus(id, status);
    if (!updated) {
      return { success: false, message: "Product not found." };
    }
    return {
      success: true,
      message: `Product status updated to ${status}.`,
      data: updated,
    };
  }

  /**
   * Delete product by ID safely
   */
  public async deleteProduct(id: number): Promise<ActionResult> {
    if (!id || typeof id !== "number") {
      return { success: false, message: "Invalid product ID." };
    }

    const result = productRepository.delete(id);
    if (!result.success) {
      return {
        success: false,
        message: result.reason || "Failed to delete product.",
      };
    }
    return {
      success: true,
      message: "Product deleted successfully.",
    };
  }

  /**
   * Get product transaction history
   */
  public async getProductHistory(id: number, startDate?: string, endDate?: string) {
    const start = startDate !== undefined ? startDate : getDefaultStartDate(60);
    const end = endDate !== undefined ? endDate : getDefaultEndDate();
    return productRepository.getProductHistory(id, start || undefined, end || undefined);
  }
}

export const productService = new ProductService();
