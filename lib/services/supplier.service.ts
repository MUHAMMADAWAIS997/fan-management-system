import { supplierRepository } from "@/lib/repositories/supplier.repository";
import { supplierSchema, updateSupplierSchema } from "@/lib/validations/supplier";
import { Supplier } from "@/lib/types/supplier";
import { ActionResult } from "@/lib/types/auth";

export class SupplierService {
  /**
   * Get all registered suppliers
   */
  public async getSuppliers(): Promise<Supplier[]> {
    return supplierRepository.getAll();
  }

  /**
   * Create supplier with validation
   */
  public async createSupplier(input: unknown): Promise<ActionResult<Supplier>> {
    const validation = supplierSchema.safeParse(input);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        message: "Invalid supplier data provided.",
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const newSupplier = supplierRepository.create(validation.data);
    return {
      success: true,
      message: "Supplier added successfully.",
      data: newSupplier,
    };
  }

  /**
   * Update supplier with validation
   */
  public async updateSupplier(input: unknown): Promise<ActionResult<Supplier>> {
    const validation = updateSupplierSchema.safeParse(input);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        message: "Invalid supplier data provided.",
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const updated = supplierRepository.update(validation.data);
    if (!updated) {
      return {
        success: false,
        message: "Supplier not found.",
      };
    }

    return {
      success: true,
      message: "Supplier updated successfully.",
      data: updated,
    };
  }

  /**
   * Delete supplier
   */
  public async deleteSupplier(id: number): Promise<ActionResult> {
    if (!id || typeof id !== "number") {
      return { success: false, message: "Invalid supplier ID." };
    }

    const result = supplierRepository.delete(id);
    if (!result.success) {
      return {
        success: false,
        message: result.reason || "Failed to delete supplier.",
      };
    }

    return {
      success: true,
      message: "Supplier deleted successfully.",
    };
  }
}

export const supplierService = new SupplierService();
