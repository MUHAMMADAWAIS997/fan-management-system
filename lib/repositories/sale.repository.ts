import db from "@/lib/db";
import { Sale, SaleItem, CreateSaleInput } from "@/lib/types/sale";

export interface CalculatedSaleItem {
  product_id: number;
  quantity: number;
  unit_retail_price: number;
  unit_discount_percent: number;
  unit_cost: number;
  unit_sale_price: number;
  total_price: number;
}

export class SaleRepository {
  /**
   * Get all sale invoices with item counts
   */
  public getAllSales(startDate?: string, endDate?: string): Sale[] {
    let query = `
      SELECT 
        s.id,
        s.invoice_number,
        s.customer_id,
        s.customer_name,
        s.customer_phone,
        s.sale_date,
        s.total_amount,
        s.payment_status,
        s.paid_amount,
        s.created_at,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) AS item_count
      FROM sales s
    `;

    const params: string[] = [];
    const conditions: string[] = [];

    if (startDate) {
      conditions.push("s.sale_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("s.sale_date <= ?");
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY s.id DESC";

    const stmt = db.prepare(query);
    return stmt.all(...params) as Sale[];
  }

  /**
   * Get single sale invoice by ID with line items
   */
  public getSaleById(id: number): Sale | null {
    const stmt = db.prepare<[number], Sale>(`
      SELECT 
        s.id,
        s.invoice_number,
        s.customer_id,
        s.customer_name,
        s.customer_phone,
        s.sale_date,
        s.total_amount,
        s.payment_status,
        s.paid_amount,
        s.shop_name,
        s.shop_tagline,
        s.shop_phone,
        s.shop_address,
        s.created_at
      FROM sales s
      WHERE s.id = ?
    `);

    const sale = stmt.get(id);
    if (!sale) return null;

    const itemsStmt = db.prepare<[number], SaleItem>(`
      SELECT 
        i.id,
        i.sale_id,
        i.product_id,
        p.name AS product_name,
        p.type AS product_type,
        p.size AS product_size,
        i.quantity,
        i.unit_retail_price,
        i.unit_discount_percent,
        i.unit_cost,
        i.unit_sale_price,
        i.total_price,
        i.created_at
      FROM sale_items i
      LEFT JOIN products p ON i.product_id = p.id
      WHERE i.sale_id = ?
      ORDER BY i.id ASC
    `);

    sale.items = itemsStmt.all(id);
    sale.item_count = sale.items.length;
    return sale;
  }

  /**
   * Record sale atomically with ACID principles:
   * 1. Check stock availability for all items.
   * 2. Insert sales header row with current business customization snapshot.
   * 3. Insert sale_items rows.
   * 4. Deduct product quantities from products table.
   * 5. Record Customer Ledger entry if customer is registered.
   */
  public createSaleTransaction(
    input: CreateSaleInput,
    itemsWithCalculatedPrices: CalculatedSaleItem[],
    grandTotalAmount: number
  ): Sale {
    const transaction = db.transaction(() => {
      // Check business rules: stock availability, non-zero quantity, discount bounds, and duplicate line items
      const seenProductIds = new Set<number>();
      for (const item of itemsWithCalculatedPrices) {
        if (item.quantity <= 0) {
          throw new Error(`Sale quantity must be greater than zero for product #${item.product_id}.`);
        }

        if (item.unit_discount_percent < 0 || item.unit_discount_percent > 100) {
          throw new Error(`Discount percentage (${item.unit_discount_percent}%) must be between 0% and 100%.`);
        }

        if (seenProductIds.has(item.product_id)) {
          throw new Error(`Duplicate product line items (#${item.product_id}) are not allowed in the same sale invoice.`);
        }
        seenProductIds.add(item.product_id);

        const prodStmt = db.prepare<[number], { id: number; name: string; quantity: number }>(`
          SELECT id, name, quantity FROM products WHERE id = ?
        `);
        const prod = prodStmt.get(item.product_id);

        if (!prod) {
          throw new Error(`Product #${item.product_id} does not exist.`);
        }

        if (prod.quantity < item.quantity) {
          throw new Error(
            `Requested sale quantity (${item.quantity}) for "${prod.name}" exceeds available stock (${prod.quantity}).`
          );
        }
      }

      // 1. Insert Sales Header
      const insertHeaderStmt = db.prepare(`
        INSERT INTO sales (
          invoice_number,
          customer_id,
          customer_name,
          customer_phone,
          sale_date,
          total_amount,
          payment_status,
          paid_amount,
          shop_name,
          shop_tagline,
          shop_phone,
          shop_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const headerResult = insertHeaderStmt.run(
        input.invoice_number,
        input.customer_id || null,
        input.customer_name,
        input.customer_phone || null,
        input.sale_date,
        grandTotalAmount,
        input.payment_status,
        input.paid_amount,
        input.shop_name || null,
        input.shop_tagline || null,
        input.shop_phone || null,
        input.shop_address || null
      );

      const saleId = headerResult.lastInsertRowid as number;

      // Prepare statements for line items and stock deduction
      const insertItemStmt = db.prepare(`
        INSERT INTO sale_items (
          sale_id,
          product_id,
          quantity,
          unit_retail_price,
          unit_discount_percent,
          unit_cost,
          unit_sale_price,
          total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE products
        SET quantity = quantity - ?
        WHERE id = ?
      `);

      const getStockItemsStmt = db.prepare<[number], { id: number; quantity: number }>(`
        SELECT id, quantity 
        FROM stock_items 
        WHERE product_id = ? AND quantity > 0 
        ORDER BY id ASC
      `);

      const updateStockItemStmt = db.prepare(`
        UPDATE stock_items 
        SET quantity = quantity - ? 
        WHERE id = ?
      `);

      // 2. Loop through line items
      for (const item of itemsWithCalculatedPrices) {
        insertItemStmt.run(
          saleId,
          item.product_id,
          item.quantity,
          item.unit_retail_price,
          item.unit_discount_percent,
          item.unit_cost,
          item.unit_sale_price,
          item.total_price
        );

        // Deduct inventory stock from products catalog
        updateStockStmt.run(item.quantity, item.product_id);

        // Deduct inventory stock from stock_items via FIFO (oldest batch items first)
        let remainingToDeduct = item.quantity;
        const availableBatches = getStockItemsStmt.all(item.product_id);

        for (const batch of availableBatches) {
          if (remainingToDeduct <= 0) break;
          const takeQty = Math.min(batch.quantity, remainingToDeduct);
          updateStockItemStmt.run(takeQty, batch.id);
          remainingToDeduct -= takeQty;
        }
      }

      // 3. Record Customer Ledger Entry if registered customer
      if (input.customer_id) {
        const prevBalStmt = db.prepare<[number], { balance: number }>(`
          SELECT balance FROM customer_ledger 
          WHERE customer_id = ? 
          ORDER BY id DESC LIMIT 1
        `);
        const prevRow = prevBalStmt.get(input.customer_id);
        const prevBalance = prevRow ? prevRow.balance : 0;

        const netChange = grandTotalAmount - input.paid_amount; // positive if debt added, 0 if fully paid
        const newBalance = Number((prevBalance + netChange).toFixed(2));

        const insertLedgerStmt = db.prepare(`
          INSERT INTO customer_ledger (
            customer_id,
            sale_id,
            invoice_number,
            date,
            description,
            debit,
            credit,
            balance
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertLedgerStmt.run(
          input.customer_id,
          saleId,
          input.invoice_number,
          input.sale_date,
          `Sale Invoice #${input.invoice_number}`,
          input.paid_amount,    // Debit = payment received
          grandTotalAmount,     // Credit = total invoice charged
          newBalance
        );
      }

      return this.getSaleById(saleId)!;
    });

    return transaction();
  }
}

export const saleRepository = new SaleRepository();
