import db from "@/lib/db";
import {
  StockBatchSummary,
  StockBatchItem,
  ReceiveMultiStockInput,
  AvailableStockRecord,
} from "@/lib/types/stock";

export interface CalculatedItem {
  product_id: number;
  quantity: number;
  unit_retail_price: number;
  unit_discount_percent: number;
  unit_cost: number;
  total_cost: number;
}

export class StockRepository {
  /**
   * Fetch all available stock records with product info, batch receipt date, RP, Discount %, Unit Cost & Margin.
   * Quantities & Totals are calculated per batch item to ensure 100% data consistency with the Products Inventory.
   */
  public getAvailableStockRecords(): AvailableStockRecord[] {
    // 1. Fetch remaining available stock per batch item from stock_items
    const batchStmt = db.prepare<[], AvailableStockRecord>(`
      SELECT 
        si.id AS item_id,
        si.batch_id,
        sb.invoice_number,
        sb.purchase_date,
        sb.company_id,
        sup.name AS supplier_name,
        si.product_id,
        p.name AS product_name,
        p.type AS product_type,
        p.size AS product_size,
        si.quantity AS batch_received_qty,
        si.quantity AS current_available_qty,
        si.unit_retail_price,
        si.unit_discount_percent,
        si.unit_cost,
        (si.unit_retail_price - si.unit_cost) AS unit_margin,
        (si.quantity * si.unit_retail_price) AS total_stock_value,
        (si.quantity * si.unit_cost) AS total_stock_cost,
        (si.quantity * (si.unit_retail_price - si.unit_cost)) AS total_potential_profit
      FROM stock_items si
      JOIN stock_batches sb ON si.batch_id = sb.id
      JOIN products p ON si.product_id = p.id
      JOIN suppliers sup ON sb.company_id = sup.id
      WHERE si.quantity > 0
      ORDER BY si.id ASC
    `);

    const batchRecords = batchStmt.all();
    const batchProductIds = new Set<number>();
    batchRecords.forEach((r) => batchProductIds.add(r.product_id));

    // 2. Fallback for active products that have quantity > 0 in products table but no stock_items entry
    const productStmt = db.prepare<[], any>(`
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.type AS product_type,
        p.size AS product_size,
        p.supplier_id AS company_id,
        sup.name AS supplier_name,
        p.quantity AS current_available_qty,
        p.retail_price AS unit_retail_price,
        p.discount AS discount_amount,
        p.cost AS unit_cost,
        p.created_at
      FROM products p
      LEFT JOIN suppliers sup ON p.supplier_id = sup.id
      WHERE COALESCE(p.status, 'active') = 'active' AND p.quantity > 0
    `);

    const activeProducts = productStmt.all();
    const fallbackRecords: AvailableStockRecord[] = [];

    for (const prod of activeProducts) {
      if (!batchProductIds.has(prod.product_id)) {
        const discPct = prod.unit_retail_price > 0 
          ? Number(((prod.discount_amount / prod.unit_retail_price) * 100).toFixed(1)) 
          : 0;
        const margin = prod.unit_retail_price - prod.unit_cost;
        fallbackRecords.push({
          item_id: prod.product_id,
          batch_id: 0,
          invoice_number: "DIRECT-STOCK",
          purchase_date: prod.created_at ? prod.created_at.split("T")[0] : "—",
          company_id: prod.company_id,
          supplier_name: prod.supplier_name || "Primary Supplier",
          product_id: prod.product_id,
          product_name: prod.product_name,
          product_type: prod.product_type,
          product_size: prod.product_size,
          batch_received_qty: prod.current_available_qty,
          current_available_qty: prod.current_available_qty,
          unit_retail_price: prod.unit_retail_price,
          unit_discount_percent: discPct,
          unit_cost: prod.unit_cost,
          unit_margin: margin,
          total_stock_value: prod.current_available_qty * prod.unit_retail_price,
          total_stock_cost: prod.current_available_qty * prod.unit_cost,
          total_potential_profit: prod.current_available_qty * margin,
        });
      }
    }

    const allRecords = [...batchRecords, ...fallbackRecords];

    // 3. Consolidate records with identical product_id, unit_retail_price, unit_discount_percent
    const consolidatedMap = new Map<string, AvailableStockRecord>();

    for (const item of allRecords) {
      const rpKey = Number(item.unit_retail_price).toFixed(2);
      const discKey = Number(item.unit_discount_percent).toFixed(2);
      const key = `${item.product_id}_${rpKey}_${discKey}`;

      if (!consolidatedMap.has(key)) {
        consolidatedMap.set(key, { ...item });
      } else {
        const existing = consolidatedMap.get(key)!;
        existing.current_available_qty += item.current_available_qty;
        existing.batch_received_qty += item.batch_received_qty;
        existing.total_stock_value += item.total_stock_value;
        existing.total_stock_cost += item.total_stock_cost;
        existing.total_potential_profit += item.total_potential_profit;

        if (!existing.supplier_name || existing.supplier_name === "Unknown Supplier") {
          if (item.supplier_name && item.supplier_name !== "Unknown Supplier") {
            existing.supplier_name = item.supplier_name;
            existing.company_id = item.company_id;
          }
        }

        if (item.purchase_date && item.purchase_date > existing.purchase_date) {
          existing.purchase_date = item.purchase_date;
        }
        if (
          item.invoice_number &&
          existing.invoice_number &&
          !existing.invoice_number.includes(item.invoice_number)
        ) {
          existing.invoice_number = `${existing.invoice_number}, ${item.invoice_number}`;
        }
      }
    }

    const consolidatedList = Array.from(consolidatedMap.values());

    consolidatedList.sort((a, b) => {
      const nameCompare = a.product_name.localeCompare(b.product_name);
      if (nameCompare !== 0) return nameCompare;
      return b.unit_retail_price - a.unit_retail_price;
    });

    return consolidatedList;
  }

  /**
   * Fetch all stock purchase batches with Supplier names & item count
   */
  public getAllBatches(startDate?: string, endDate?: string): StockBatchSummary[] {
    let query = `
      SELECT 
        b.id,
        b.company_id,
        s.name AS company_name,
        s.phone AS company_phone,
        b.purchase_date,
        b.invoice_number,
        b.total_amount,
        b.payment_status,
        b.paid_amount,
        b.created_at,
        (SELECT COUNT(*) FROM stock_items WHERE batch_id = b.id) AS item_count
      FROM stock_batches b
      LEFT JOIN suppliers s ON b.company_id = s.id
    `;

    const params: string[] = [];
    const conditions: string[] = [];

    if (startDate) {
      conditions.push("b.purchase_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("b.purchase_date <= ?");
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY b.id DESC";

    const stmt = db.prepare(query);
    const batches = stmt.all(...params) as StockBatchSummary[];

    // Fallback: If legacy single-item stock records exist, convert them to summary items
    const legacyStmt = db.prepare(`
      SELECT 
        l.id,
        l.company_id,
        sup.name AS company_name,
        sup.phone AS company_phone,
        l.purchase_date,
        l.invoice_number,
        l.total_cost AS total_amount,
        l.payment_status,
        l.paid_amount,
        l.created_at,
        1 AS item_count
      FROM stock l
      LEFT JOIN suppliers sup ON l.company_id = sup.id
      ORDER BY l.id DESC
    `);
    const legacyItems = legacyStmt.all() as StockBatchSummary[];

    const combined = [...batches, ...legacyItems];
    combined.sort((a, b) => {
      if (b.purchase_date && a.purchase_date && b.purchase_date !== a.purchase_date) {
        return b.purchase_date.localeCompare(a.purchase_date);
      }
      return b.id - a.id;
    });

    return combined;
  }

  /**
   * Get single batch by ID with all item details
   */
  public getBatchById(id: number): StockBatchSummary | null {
    // Try stock_batches first
    const batchStmt = db.prepare<[number], StockBatchSummary>(`
      SELECT 
        b.id,
        b.company_id,
        s.name AS company_name,
        s.phone AS company_phone,
        b.purchase_date,
        b.invoice_number,
        b.total_amount,
        b.payment_status,
        b.paid_amount,
        b.created_at
      FROM stock_batches b
      LEFT JOIN suppliers s ON b.company_id = s.id
      WHERE b.id = ?
    `);

    const batch = batchStmt.get(id);

    if (batch) {
      const itemsStmt = db.prepare<[number], StockBatchItem>(`
        SELECT 
          i.id,
          i.batch_id,
          i.product_id,
          p.name AS product_name,
          p.type AS product_type,
          p.size AS product_size,
          i.quantity,
          i.unit_retail_price,
          i.unit_discount_percent,
          i.unit_cost,
          i.total_cost,
          i.created_at
        FROM stock_items i
        LEFT JOIN products p ON i.product_id = p.id
        WHERE i.batch_id = ?
        ORDER BY i.id ASC
      `);

      batch.items = itemsStmt.all(id);
      batch.item_count = batch.items.length;
      return batch;
    }

    // Fallback: Check legacy stock table
    const legacyStmt = db.prepare<[number], any>(`
      SELECT 
        l.id,
        l.product_id,
        p.name AS product_name,
        p.type AS product_type,
        p.size AS product_size,
        l.company_id,
        sup.name AS company_name,
        sup.phone AS company_phone,
        l.purchase_date,
        l.invoice_number,
        l.quantity,
        l.unit_retail_price,
        l.unit_discount_percent,
        l.unit_cost,
        l.total_cost,
        l.payment_status,
        l.paid_amount,
        l.created_at
      FROM stock l
      LEFT JOIN products p ON l.product_id = p.id
      LEFT JOIN suppliers sup ON l.company_id = sup.id
      WHERE l.id = ?
    `);

    const legacy = legacyStmt.get(id);
    if (!legacy) return null;

    return {
      id: legacy.id,
      company_id: legacy.company_id,
      company_name: legacy.company_name,
      company_phone: legacy.company_phone,
      purchase_date: legacy.purchase_date,
      invoice_number: legacy.invoice_number,
      total_amount: legacy.total_cost,
      payment_status: legacy.payment_status,
      paid_amount: legacy.paid_amount,
      created_at: legacy.created_at,
      item_count: 1,
      items: [
        {
          id: legacy.id,
          batch_id: legacy.id,
          product_id: legacy.product_id,
          product_name: legacy.product_name,
          product_type: legacy.product_type,
          product_size: legacy.product_size,
          quantity: legacy.quantity,
          unit_retail_price: legacy.unit_retail_price,
          unit_discount_percent: legacy.unit_discount_percent,
          unit_cost: legacy.unit_cost,
          total_cost: legacy.total_cost,
          created_at: legacy.created_at,
        },
      ],
    };
  }

  /**
   * Receive multi-product stock batch atomically with ACID principles:
   * 1. Insert header in stock_batches
   * 2. Insert items in stock_items
   * 3. Update products table quantities & prices
   * 4. Record Supplier Ledger transaction
   * 5. Record Expense entry for paid amount
   */
  public receiveMultiStockTransaction(
    input: ReceiveMultiStockInput,
    itemsWithCalculatedCosts: CalculatedItem[],
    grandTotalCost: number
  ): StockBatchSummary {
    const transaction = db.transaction(() => {
      // 0. Verify supplier foreign key existence
      const supCheck = db.prepare<[number], { id: number }>(
        "SELECT id FROM suppliers WHERE id = ?"
      ).get(input.company_id);
      if (!supCheck) {
        throw new Error(`Supplier #${input.company_id} does not exist.`);
      }

      // 1. Insert batch header
      const insertHeaderStmt = db.prepare(`
        INSERT INTO stock_batches (
          company_id,
          purchase_date,
          invoice_number,
          total_amount,
          payment_status,
          paid_amount
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      const headerResult = insertHeaderStmt.run(
        input.company_id,
        input.purchase_date,
        input.invoice_number,
        grandTotalCost,
        input.payment_status,
        input.paid_amount
      );

      const batchId = headerResult.lastInsertRowid as number;

      // Prepare statements for batch items and product updates
      const insertItemStmt = db.prepare(`
        INSERT INTO stock_items (
          batch_id,
          product_id,
          quantity,
          unit_retail_price,
          unit_discount_percent,
          unit_cost,
          total_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const updateProductStmt = db.prepare(`
        UPDATE products 
        SET quantity = quantity + ?
        WHERE id = ?
      `);

      // 2. Loop through calculated items with business logic validation
      const seenProductIds = new Set<number>();
      for (const item of itemsWithCalculatedCosts) {
        if (item.quantity <= 0) {
          throw new Error(`Purchase quantity must be greater than zero for product #${item.product_id}.`);
        }

        if (seenProductIds.has(item.product_id)) {
          throw new Error(`Duplicate product line items (#${item.product_id}) are not allowed in the same purchase batch.`);
        }
        seenProductIds.add(item.product_id);

        insertItemStmt.run(
          batchId,
          item.product_id,
          item.quantity,
          item.unit_retail_price,
          item.unit_discount_percent,
          item.unit_cost,
          item.total_cost
        );

        updateProductStmt.run(
          item.quantity,
          item.product_id
        );
      }

      // 3. Record Supplier Ledger Entry
      const prevBalStmt = db.prepare<[number], { balance: number }>(`
        SELECT balance FROM supplier_ledger 
        WHERE supplier_id = ? 
        ORDER BY id DESC LIMIT 1
      `);
      const prevRow = prevBalStmt.get(input.company_id);
      const prevBalance = prevRow ? prevRow.balance : 0;

      const netChange = grandTotalCost - input.paid_amount;
      const newBalance = Number((prevBalance + netChange).toFixed(2));

      const insertLedgerStmt = db.prepare(`
        INSERT INTO supplier_ledger (
          supplier_id,
          batch_id,
          invoice_number,
          date,
          description,
          debit,
          credit,
          balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertLedgerStmt.run(
        input.company_id,
        batchId,
        input.invoice_number,
        input.purchase_date,
        `Stock Batch Purchase Invoice #${input.invoice_number}`,
        input.paid_amount,
        grandTotalCost,
        newBalance
      );

      // 4. Record Expense Entry (if paid_amount > 0)
      if (input.paid_amount > 0) {
        const insertExpenseStmt = db.prepare(`
          INSERT INTO expenses (category, description, amount, date, reference_id)
          VALUES (?, ?, ?, ?, ?)
        `);

        insertExpenseStmt.run(
          "Stock Purchase",
          `Stock Batch Purchase Invoice #${input.invoice_number}`,
          input.paid_amount,
          input.purchase_date,
          input.invoice_number
        );
      }

      return this.getBatchById(batchId)!;
    });

    return transaction();
  }
}

export const stockRepository = new StockRepository();
