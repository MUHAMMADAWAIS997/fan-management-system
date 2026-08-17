import { db } from "@/lib/db/index";
import { Product, CreateProductInput, UpdateProductInput } from "@/lib/types/product";

export class ProductRepository {
  /**
   * Fetch all products with supplier names ordered by ID descending
   */
  public getAll(): Product[] {
    const stmt = db.prepare<[], Product>(`
      SELECT 
        p.id, 
        p.name, 
        p.description,
        p.type, 
        p.size, 
        p.supplier_id, 
        s.name AS supplier_name,
        p.quantity, 
        p.retail_price, 
        p.discount, 
        p.cost, 
        COALESCE(p.status, 'active') AS status,
        p.created_at 
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.id ASC
    `);
    return stmt.all();
  }

  /**
   * Fetch only active products for sales, stock receiving, and selection dropdowns
   */
  public getActiveOnly(): Product[] {
    const stmt = db.prepare<[], Product>(`
      SELECT 
        p.id, 
        p.name, 
        p.description,
        p.type, 
        p.size, 
        p.supplier_id, 
        s.name AS supplier_name,
        p.quantity, 
        p.retail_price, 
        p.discount, 
        p.cost, 
        COALESCE(p.status, 'active') AS status,
        p.created_at 
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE COALESCE(p.status, 'active') = 'active'
      ORDER BY p.id DESC
    `);
    return stmt.all();
  }

  /**
   * Fetch product by ID
   */
  public getById(id: number): Product | undefined {
    const stmt = db.prepare<[number], Product>(`
      SELECT 
        p.id, 
        p.name, 
        p.description,
        p.type, 
        p.size, 
        p.supplier_id, 
        s.name AS supplier_name,
        p.quantity, 
        p.retail_price, 
        p.discount, 
        p.cost, 
        COALESCE(p.status, 'active') AS status,
        p.created_at 
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `);
    return stmt.get(id);
  }

  /**
   * Check for duplicate product by name, type, size, and supplier
   */
  public findDuplicate(name: string, type: string, size: string, supplierId: number): Product | undefined {
    if (!name || !type || !size || !supplierId) return undefined;
    const stmt = db.prepare<[string, string, string, number], Product>(`
      SELECT id, name, description, type, size, supplier_id, quantity, retail_price, discount, cost, status, created_at
      FROM products
      WHERE LOWER(name) = LOWER(?) AND LOWER(type) = LOWER(?) AND LOWER(size) = LOWER(?) AND supplier_id = ?
    `);
    return stmt.get(name.trim(), type.trim(), size.trim(), supplierId);
  }

  /**
   * Create product wrapped in an ACID transaction
   */
  public create(data: CreateProductInput): Product {
    const createTx = db.transaction((input: CreateProductInput) => {
      const existing = this.findDuplicate(input.name, input.type, input.size, input.supplier_id);
      if (existing) {
        throw new Error(
          `A product "${input.name}" (${input.type} - ${input.size}) already exists for this supplier.`
        );
      }

      const stmt = db.prepare(`
        INSERT INTO products (name, description, type, size, supplier_id, quantity, retail_price, discount, cost, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        input.name.trim(),
        input.description ? input.description.trim() : null,
        input.type.trim(),
        input.size.trim(),
        input.supplier_id,
        Math.max(0, input.quantity),
        Math.max(0, input.retail_price),
        Math.max(0, input.discount),
        Math.max(0, input.cost),
        input.status || "active"
      );
      const newId = Number(info.lastInsertRowid);

      if (input.quantity > 0) {
        const discPct = input.retail_price > 0
          ? Number(((input.discount / input.retail_price) * 100).toFixed(1))
          : 0;
        const totalCost = Number((input.cost * input.quantity).toFixed(2));
        const purchaseDate = new Date().toISOString().slice(0, 10);

        const batchRes = db.prepare(`
          INSERT INTO stock_batches (company_id, purchase_date, invoice_number, total_amount, payment_status, paid_amount)
          VALUES (?, ?, ?, ?, 'paid', ?)
        `).run(input.supplier_id, purchaseDate, "INITIAL-STOCK", totalCost, totalCost);

        db.prepare(`
          INSERT INTO stock_items (batch_id, product_id, quantity, unit_retail_price, unit_discount_percent, unit_cost, total_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(Number(batchRes.lastInsertRowid), newId, input.quantity, input.retail_price, discPct, input.cost, totalCost);
      }

      return this.getById(newId)!;
    });

    return createTx(data);
  }

  /**
   * Update product wrapped in an ACID transaction
   */
  public update(data: UpdateProductInput): Product | undefined {
    const updateTx = db.transaction((input: UpdateProductInput) => {
      const existing = this.findDuplicate(input.name, input.type, input.size, input.supplier_id);
      if (existing && existing.id !== input.id) {
        throw new Error(
          `Another product "${input.name}" (${input.type} - ${input.size}) already exists for this supplier.`
        );
      }

      const stmt = db.prepare(`
        UPDATE products 
        SET name = ?, description = ?, type = ?, size = ?, supplier_id = ?, quantity = ?, retail_price = ?, discount = ?, cost = ?, status = ?
        WHERE id = ?
      `);
      stmt.run(
        input.name.trim(),
        input.description ? input.description.trim() : null,
        input.type.trim(),
        input.size.trim(),
        input.supplier_id,
        Math.max(0, input.quantity),
        Math.max(0, input.retail_price),
        Math.max(0, input.discount),
        Math.max(0, input.cost),
        input.status || "active",
        input.id
      );
      return this.getById(input.id);
    });

    return updateTx(data);
  }

  /**
   * Toggle product status (active <-> inactive)
   */
  public toggleStatus(id: number, status: string): Product | undefined {
    const stmt = db.prepare("UPDATE products SET status = ? WHERE id = ?");
    stmt.run(status, id);
    return this.getById(id);
  }

  /**
   * Delete product by ID using soft delete (sets status = 'inactive')
   */
  public delete(id: number): { success: boolean; reason?: string } {
    try {
      const stmt = db.prepare("UPDATE products SET status = 'inactive' WHERE id = ?");
      const info = stmt.run(id);
      if (info.changes === 0) {
        return { success: false, reason: "Product not found." };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, reason: error?.message || "Failed to soft delete product." };
    }
  }

  /**
   * Get product transaction history (IN from stock receiving and OUT from sales)
   */
  public getProductHistory(productId: number, startDate?: string, endDate?: string) {
    const product = this.getById(productId);
    if (!product) return null;

    let inQuery = `
      SELECT 
        si.id,
        sb.id AS batch_id,
        sb.purchase_date AS date,
        sb.invoice_number,
        s.name AS party_name,
        si.quantity,
        si.unit_retail_price,
        si.unit_cost AS unit_price,
        si.total_cost AS total_price,
        si.created_at
      FROM stock_items si
      JOIN stock_batches sb ON si.batch_id = sb.id
      LEFT JOIN suppliers s ON sb.company_id = s.id
      WHERE si.product_id = ?
    `;

    const inParams: any[] = [productId];
    if (startDate) {
      inQuery += " AND sb.purchase_date >= ?";
      inParams.push(startDate);
    }
    if (endDate) {
      inQuery += " AND sb.purchase_date <= ?";
      inParams.push(endDate);
    }

    const inStmt = db.prepare(inQuery);

    const inRows = inStmt.all(...inParams).map((r: any) => ({
      id: `IN-${r.id}`,
      batch_id: r.batch_id,
      type: "IN" as const,
      date: r.date || (r.created_at ? r.created_at.split("T")[0] : "—"),
      invoice_number: r.invoice_number || "BATCH",
      party_name: r.party_name || product.supplier_name || "Supplier",
      quantity: r.quantity,
      unit_retail_price: r.unit_retail_price || 0,
      unit_price: r.unit_price || 0,
      total_price: r.total_price || 0,
      created_at: r.created_at || r.date,
    }));

    // Fetch OUT transactions from sale_items + sales
    let outQuery = `
      SELECT 
        si.id,
        s.id AS sale_id,
        s.sale_date AS date,
        s.invoice_number,
        s.customer_name AS party_name,
        si.quantity,
        si.unit_retail_price,
        si.unit_sale_price AS unit_price,
        si.total_price,
        si.created_at
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE si.product_id = ?
    `;

    const outParams: any[] = [productId];
    if (startDate) {
      outQuery += " AND s.sale_date >= ?";
      outParams.push(startDate);
    }
    if (endDate) {
      outQuery += " AND s.sale_date <= ?";
      outParams.push(endDate);
    }

    const outStmt = db.prepare(outQuery);

    const outRows = outStmt.all(...outParams).map((r: any) => ({
      id: `OUT-${r.id}`,
      sale_id: r.sale_id,
      type: "OUT" as const,
      date: r.date || (r.created_at ? r.created_at.split("T")[0] : "—"),
      invoice_number: r.invoice_number || "SALE",
      party_name: r.party_name || "Walk-in Customer",
      quantity: r.quantity,
      unit_retail_price: r.unit_retail_price || 0,
      unit_price: r.unit_price || 0,
      total_price: r.total_price || 0,
      created_at: r.created_at || r.date,
    }));

    const parseTime = (str?: string): number => {
      if (!str) return 0;
      const iso = str.includes(" ") && !str.includes("T") ? str.replace(" ", "T") : str;
      const t = new Date(iso).getTime();
      return isNaN(t) ? 0 : t;
    };

    // Combine and sort by date DESC, then created_at DESC (Most recent transaction on TOP!)
    const combined = [...inRows, ...outRows].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }

      const timeA = parseTime(a.created_at);
      const timeB = parseTime(b.created_at);
      if (timeB !== timeA) {
        return timeB - timeA;
      }

      return b.id.localeCompare(a.id);
    });

    const totalReceived = inRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalSold = outRows.reduce((sum, r) => sum + r.quantity, 0);
    const totalSalesRevenue = outRows.reduce((sum, r) => sum + r.total_price, 0);
    const totalPurchaseCost = inRows.reduce((sum, r) => sum + r.total_price, 0);

    return {
      product,
      transactions: combined,
      summary: {
        totalReceived,
        totalSold,
        currentStock: product.quantity,
        totalSalesRevenue,
        totalPurchaseCost,
      },
    };
  }
}

export const productRepository = new ProductRepository();
