import { db } from "@/lib/db/index";
import { Customer, CreateCustomerInput, UpdateCustomerInput } from "@/lib/types/customer";

export class CustomerRepository {
  /**
   * Fetch all registered customers ordered by ID descending
   */
  public getAll(): Customer[] {
    const stmt = db.prepare<[], Customer>(
      "SELECT id, name, phone, location, created_at FROM customers ORDER BY id DESC"
    );
    return stmt.all();
  }

  /**
   * Fetch customer by ID using parameterized query
   */
  public getById(id: number): Customer | undefined {
    const stmt = db.prepare<[number], Customer>(
      "SELECT id, name, phone, location, created_at FROM customers WHERE id = ?"
    );
    return stmt.get(id);
  }

  /**
   * Fetch customer by phone number
   */
  public getByPhone(phone: string): Customer | undefined {
    if (!phone || !phone.trim()) return undefined;
    const stmt = db.prepare<[string], Customer>(
      "SELECT id, name, phone, location, created_at FROM customers WHERE phone = ?"
    );
    return stmt.get(phone.trim());
  }

  /**
   * Create customer wrapped in an ACID transaction
   */
  public create(data: CreateCustomerInput): Customer {
    const transaction = db.transaction(() => {
      const existing = this.getByPhone(data.phone);
      if (existing) {
        throw new Error(`A customer with phone number "${data.phone}" already exists.`);
      }

      const stmt = db.prepare(
        "INSERT INTO customers (name, phone, location) VALUES (?, ?, ?)"
      );
      const info = stmt.run(data.name.trim(), data.phone.trim(), data.location ? data.location.trim() : null);
      const newId = Number(info.lastInsertRowid);
      return this.getById(newId)!;
    });

    return transaction();
  }

  /**
   * Update customer wrapped in an ACID transaction
   */
  public update(data: UpdateCustomerInput): Customer | undefined {
    const transaction = db.transaction(() => {
      const existing = this.getByPhone(data.phone);
      if (existing && existing.id !== data.id) {
        throw new Error(`Another customer with phone number "${data.phone}" already exists.`);
      }

      const stmt = db.prepare(
        "UPDATE customers SET name = ?, phone = ?, location = ? WHERE id = ?"
      );
      stmt.run(data.name.trim(), data.phone.trim(), data.location ? data.location.trim() : null, data.id);
      return this.getById(data.id);
    });

    return transaction();
  }

  /**
   * Delete customer by ID wrapped in an ACID transaction with FK check
   */
  public delete(id: number): { success: boolean; reason?: string } {
    const transaction = db.transaction(() => {
      const salesCount = db.prepare<[number], { count: number }>(
        "SELECT count(*) as count FROM sales WHERE customer_id = ?"
      ).get(id)?.count || 0;

      const ledgerCount = db.prepare<[number], { count: number }>(
        "SELECT count(*) as count FROM customer_ledger WHERE customer_id = ?"
      ).get(id)?.count || 0;

      if (salesCount > 0 || ledgerCount > 0) {
        return {
          success: false,
          reason: "Cannot delete customer because they have recorded sales or ledger transactions.",
        };
      }

      try {
        const stmt = db.prepare("DELETE FROM customers WHERE id = ?");
        const info = stmt.run(id);
        if (info.changes === 0) {
          return { success: false, reason: "Customer not found." };
        }
        return { success: true };
      } catch (error: any) {
        if (error?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
          return {
            success: false,
            reason: "Cannot delete customer due to linked sales or ledger records.",
          };
        }
        return { success: false, reason: error?.message || "Failed to delete customer." };
      }
    });

    return transaction();
  }
}

export const customerRepository = new CustomerRepository();
