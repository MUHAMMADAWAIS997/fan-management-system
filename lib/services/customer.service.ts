import { customerRepository } from "@/lib/repositories/customer.repository";
import { customerSchema, updateCustomerSchema } from "@/lib/validations/customer";
import { Customer } from "@/lib/types/customer";
import { ActionResult } from "@/lib/types/auth";

export class CustomerService {
  /**
   * Get all registered customers
   */
  public async getCustomers(): Promise<Customer[]> {
    return customerRepository.getAll();
  }

  /**
   * Create a new customer with input validation
   */
  public async createCustomer(input: unknown): Promise<ActionResult<Customer>> {
    const validation = customerSchema.safeParse(input);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        message: "Invalid customer data provided.",
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const newCustomer = customerRepository.create(validation.data);
    return {
      success: true,
      message: "Customer added successfully.",
      data: newCustomer,
    };
  }

  /**
   * Update existing customer
   */
  public async updateCustomer(input: unknown): Promise<ActionResult<Customer>> {
    const validation = updateCustomerSchema.safeParse(input);

    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        message: "Invalid customer data provided.",
        errors: fieldErrors as Record<string, string[]>,
      };
    }

    const updated = customerRepository.update(validation.data);
    if (!updated) {
      return {
        success: false,
        message: "Customer not found.",
      };
    }

    return {
      success: true,
      message: "Customer updated successfully.",
      data: updated,
    };
  }

  /**
   * Delete customer by ID safely
   */
  public async deleteCustomer(id: number): Promise<ActionResult> {
    if (!id || typeof id !== "number") {
      return { success: false, message: "Invalid customer ID." };
    }

    const result = customerRepository.delete(id);
    if (!result.success) {
      return {
        success: false,
        message: result.reason || "Failed to delete customer.",
      };
    }

    return {
      success: true,
      message: "Customer deleted successfully.",
    };
  }
}

export const customerService = new CustomerService();
