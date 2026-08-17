import { db } from "@/lib/db/index";
import { Supplier, CreateSupplierInput, UpdateSupplierInput } from "@/lib/types/supplier";

export class SupplierRepository {
  /**
   * Fetch all registered suppliers ordered by ID descending
   */
  public getAll(): Supplier[] {
    const stmt = db.prepare<[], Supplier>(
      "SELECT id, name, phone, created_at FROM suppliers ORDER BY id DESC"
    );
    return stmt.all();
  }

  /**
   * Fetch supplier by ID using parameterized query
   */
  public getById(id: number): Supplier | undefined {
    const stmt = db.prepare<[number], Supplier>(
      "SELECT id, name, phone, created_at FROM suppliers WHERE id = ?"
    );
    return stmt.get(id);
  }

  /**
   * Fetch supplier by phone or name
   */
  public getByPhoneOrName(phone: string, name: string): Supplier | undefined {
    if (!phone || !name) return undefined;
    const stmt = db.prepare<[string, string], Supplier>(
      "SELECT id, name, phone, created_at FROM suppliers WHERE phone = ? OR LOWER(name) = LOWER(?)"
    );
    return stmt.get(phone.trim(), name.trim());
  }

  /**
   * Create supplier wrapped in an ACID transaction
   */
  public create(data: CreateSupplierInput): Supplier {
    const transaction = db.transaction(() => {
      const existing = this.getByPhoneOrName(data.phone, data.name);
      if (existing) {
        throw new Error(`A supplier with name "${data.name}" or phone "${data.phone}" already exists.`);
      }

      const stmt = db.prepare(
        "INSERT INTO suppliers (name, phone) VALUES (?, ?)"
      );
      const info = stmt.run(data.name.trim(), data.phone.trim());
      const newId = Number(info.lastInsertRowid);
      return this.getById(newId)!;
    });

    return transaction();
  }

  /**
   * Update supplier wrapped in an ACID transaction
   */
  public update(data: UpdateSupplierInput): Supplier | undefined {
    const transaction = db.transaction(() => {
      const existing = this.getByPhoneOrName(data.phone, data.name);
      if (existing && existing.id !== data.id) {
        throw new Error(`Another supplier with name "${data.name}" or phone "${data.phone}" already exists.`);
      }

      const stmt = db.prepare(
        "UPDATE suppliers SET name = ?, phone = ? WHERE id = ?"
      );
      stmt.run(data.name.trim(), data.phone.trim(), data.id);
      return this.getById(data.id);
    });

    return transaction();
  }

  /**
   * Delete supplier by ID wrapped in an ACID transaction with FK check
   */
  public delete(id: number): { success: boolean; reason?: string } {
    const transaction = db.transaction(() => {
      const productCount = db.prepare<[number], { count: number }>(
        "SELECT count(*) as count FROM products WHERE supplier_id = ?"
      ).get(id)?.count || 0;

      const batchCount = db.prepare<[number], { count: number }>(
        "SELECT count(*) as count FROM stock_batches WHERE company_id = ?"
      ).get(id)?.count || 0;

      const ledgerCount = db.prepare<[number], { count: number }>(
        "SELECT count(*) as count FROM supplier_ledger WHERE supplier_id = ?"
      ).get(id)?.count || 0;

      if (productCount > 0 || batchCount > 0 || ledgerCount > 0) {
        return {
          success: false,
          reason: "Cannot delete supplier because they are linked to existing products, stock batches, or ledger records.",
        };
      }

      try {
        const stmt = db.prepare("DELETE FROM suppliers WHERE id = ?");
        const info = stmt.run(id);
        if (info.changes === 0) {
          return { success: false, reason: "Supplier not found." };
        }
        return { success: true };
      } catch (error: any) {
        if (error?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
          return {
            success: false,
            reason: "Cannot delete supplier because they have products or stock records associated with them.",
          };
        }
        return { success: false, reason: error?.message || "Failed to delete supplier." };
      }
    });

    return transaction();
  }
}

export const supplierRepository = new SupplierRepository();
