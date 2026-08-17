import db from "@/lib/db";

export class ReportService {
  /**
   * Monthly Customer Ledger Statement Report (All Customers for current month)
   */
  public getMonthlyCustomerLedgerCSV(): string {
    const rows = db.prepare(`
      SELECT 
        c.name as customer_name,
        c.phone as customer_phone,
        cl.date,
        COALESCE(cl.invoice_number, '') as invoice_number,
        COALESCE(cl.description, '') as description,
        cl.debit,
        cl.credit,
        cl.balance
      FROM customer_ledger cl
      JOIN customers c ON cl.customer_id = c.id
      WHERE strftime('%Y-%m', cl.date) = strftime('%Y-%m', 'now', 'localtime')
      ORDER BY cl.date DESC, cl.id DESC
    `).all() as any[];

    const headers = [
      "Customer Name",
      "Phone",
      "Date",
      "Invoice #",
      "Description",
      "Debit (Payment)",
      "Credit (Sale)",
      "Balance Owed",
    ];

    const csvLines = [headers.join(",")];
    for (const r of rows) {
      csvLines.push([
        `"${r.customer_name.replace(/"/g, '""')}"`,
        `"${(r.customer_phone || "").replace(/"/g, '""')}"`,
        `"${r.date}"`,
        `"${r.invoice_number}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        r.debit,
        r.credit,
        r.balance,
      ].join(","));
    }

    return csvLines.join("\n");
  }

  /**
   * Monthly Product Purchases Report (Current month inventory stock purchases)
   */
  public getMonthlyProductPurchasesCSV(): string {
    const rows = db.prepare(`
      SELECT 
        sb.purchase_date,
        sb.invoice_number,
        s.name as supplier_name,
        p.name as product_name,
        p.type as product_type,
        p.size as product_size,
        si.quantity,
        si.unit_retail_price,
        si.unit_discount_percent,
        si.unit_cost,
        si.total_cost
      FROM stock_items si
      JOIN stock_batches sb ON si.batch_id = sb.id
      JOIN suppliers s ON sb.company_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE strftime('%Y-%m', sb.purchase_date) = strftime('%Y-%m', 'now', 'localtime')
      ORDER BY sb.purchase_date DESC, sb.id DESC
    `).all() as any[];

    const headers = [
      "Purchase Date",
      "Invoice #",
      "Supplier",
      "Product Name",
      "Type",
      "Size",
      "Quantity",
      "Retail Price",
      "Discount %",
      "Unit Cost",
      "Total Cost",
    ];

    const csvLines = [headers.join(",")];
    for (const r of rows) {
      csvLines.push([
        `"${r.purchase_date}"`,
        `"${r.invoice_number}"`,
        `"${r.supplier_name.replace(/"/g, '""')}"`,
        `"${r.product_name.replace(/"/g, '""')}"`,
        `"${r.product_type}"`,
        `"${r.product_size}"`,
        r.quantity,
        r.unit_retail_price,
        r.unit_discount_percent,
        r.unit_cost,
        r.total_cost,
      ].join(","));
    }

    return csvLines.join("\n");
  }

  /**
   * Monthly Product Sold Report (Current month product sales)
   */
  public getMonthlyProductSalesCSV(): string {
    const rows = db.prepare(`
      SELECT 
        sal.sale_date,
        sal.invoice_number,
        sal.customer_name,
        p.name as product_name,
        p.type as product_type,
        p.size as product_size,
        si.quantity,
        si.unit_retail_price,
        si.unit_discount_percent,
        si.unit_cost,
        si.unit_sale_price,
        si.total_price,
        ((si.unit_sale_price - si.unit_cost) * si.quantity) as profit
      FROM sale_items si
      JOIN sales sal ON si.sale_id = sal.id
      JOIN products p ON si.product_id = p.id
      WHERE strftime('%Y-%m', sal.sale_date) = strftime('%Y-%m', 'now', 'localtime')
      ORDER BY sal.sale_date DESC, sal.id DESC
    `).all() as any[];

    const headers = [
      "Sale Date",
      "Invoice #",
      "Customer",
      "Product Name",
      "Type",
      "Size",
      "Quantity",
      "Unit RP",
      "Discount %",
      "Unit Cost",
      "Unit Sale Price",
      "Total Sale Price",
      "Est. Profit",
    ];

    const csvLines = [headers.join(",")];
    for (const r of rows) {
      csvLines.push([
        `"${r.sale_date}"`,
        `"${r.invoice_number}"`,
        `"${r.customer_name.replace(/"/g, '""')}"`,
        `"${r.product_name.replace(/"/g, '""')}"`,
        `"${r.product_type}"`,
        `"${r.product_size}"`,
        r.quantity,
        r.unit_retail_price,
        r.unit_discount_percent,
        r.unit_cost,
        r.unit_sale_price,
        r.total_price,
        r.profit,
      ].join(","));
    }

    return csvLines.join("\n");
  }

  /**
   * Monthly Supplier Ledger Statement Report (All Suppliers for current month)
   */
  public getMonthlySupplierLedgerCSV(): string {
    const rows = db.prepare(`
      SELECT 
        s.name as supplier_name,
        s.phone as supplier_phone,
        sl.date,
        COALESCE(sl.invoice_number, '') as invoice_number,
        COALESCE(sl.description, '') as description,
        sl.debit,
        sl.credit,
        sl.balance
      FROM supplier_ledger sl
      JOIN suppliers s ON sl.supplier_id = s.id
      WHERE strftime('%Y-%m', sl.date) = strftime('%Y-%m', 'now', 'localtime')
      ORDER BY sl.date DESC, sl.id DESC
    `).all() as any[];

    const headers = [
      "Supplier Name",
      "Phone",
      "Date",
      "Invoice #",
      "Description",
      "Debit (Payment)",
      "Credit (Purchase)",
      "Balance Owed",
    ];

    const csvLines = [headers.join(",")];
    for (const r of rows) {
      csvLines.push([
        `"${r.supplier_name.replace(/"/g, '""')}"`,
        `"${(r.supplier_phone || "").replace(/"/g, '""')}"`,
        `"${r.date}"`,
        `"${r.invoice_number}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        r.debit,
        r.credit,
        r.balance,
      ].join(","));
    }

    return csvLines.join("\n");
  }
}

export const reportService = new ReportService();
