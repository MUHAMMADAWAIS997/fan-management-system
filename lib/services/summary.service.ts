import db from "@/lib/db";

export type SummaryType =
  | "sales"
  | "purchases"
  | "received-payments"
  | "outstanding"
  | "supplier-debt"
  | "profit"
  | "stock-purchased"
  | "customers"
  | "suppliers";

export interface SummaryReportResult {
  type: SummaryType;
  title: string;
  subtitle: string;
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>;
  rows: Array<Record<string, any>>;
  summaryMetrics?: Record<string, number | string>;
}

export class SummaryService {
  public getSummaryData(
    type: SummaryType,
    startDate?: string,
    endDate?: string,
    searchQuery?: string
  ): SummaryReportResult {
    switch (type) {
      case "sales":
        return this.getSalesSummary(startDate, endDate, searchQuery);
      case "purchases":
        return this.getPurchasesSummary(startDate, endDate, searchQuery);
      case "received-payments":
        return this.getReceivedPaymentsSummary(startDate, endDate, searchQuery);
      case "outstanding":
        return this.getOutstandingSummary(startDate, endDate, searchQuery);
      case "supplier-debt":
        return this.getSupplierDebtSummary(startDate, endDate, searchQuery);
      case "profit":
        return this.getProfitSummary(startDate, endDate, searchQuery);
      case "stock-purchased":
        return this.getStockPurchasedSummary(startDate, endDate, searchQuery);
      case "customers":
        return this.getCustomersSummary(startDate, endDate, searchQuery);
      case "suppliers":
        return this.getSuppliersSummary(startDate, endDate, searchQuery);
      default:
        return this.getSalesSummary(startDate, endDate, searchQuery);
    }
  }

  private getSalesSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        s.id,
        s.invoice_number,
        s.customer_name,
        s.customer_phone,
        s.sale_date AS date,
        s.total_amount,
        s.paid_amount,
        (s.total_amount - s.paid_amount) AS balance,
        s.payment_status,
        s.created_at
      FROM sales s
    `;

    const params: string[] = [];
    const conds: string[] = [];

    if (startDate) {
      conds.push("s.sale_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conds.push("s.sale_date <= ?");
      params.push(endDate);
    }
    if (search && search.trim()) {
      conds.push("(s.invoice_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)");
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    if (conds.length > 0) {
      query += " WHERE " + conds.join(" AND ");
    }
    query += " ORDER BY s.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    let totalRevenue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    rows.forEach((r) => {
      totalRevenue += r.total_amount || 0;
      totalPaid += r.paid_amount || 0;
      totalOutstanding += Math.max(0, (r.total_amount || 0) - (r.paid_amount || 0));
    });

    return {
      type: "sales",
      title: "Complete Sales Invoices Report",
      subtitle: `Displaying ${rows.length} sales invoice transactions`,
      columns: [
        { key: "invoice_number", label: "Invoice #" },
        { key: "date", label: "Date" },
        { key: "customer_name", label: "Customer" },
        { key: "total_amount", label: "Total Revenue (Rs.)", align: "right" },
        { key: "paid_amount", label: "Paid (Rs.)", align: "right" },
        { key: "balance", label: "Outstanding (Rs.)", align: "right" },
        { key: "payment_status", label: "Status", align: "center" },
      ],
      rows,
      summaryMetrics: {
        "Total Invoices": rows.length,
        "Total Revenue": `Rs. ${totalRevenue.toLocaleString()}`,
        "Total Paid": `Rs. ${totalPaid.toLocaleString()}`,
        "Total Outstanding": `Rs. ${totalOutstanding.toLocaleString()}`,
      },
    };
  }

  private getPurchasesSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        b.id,
        b.invoice_number,
        s.name AS supplier_name,
        b.purchase_date AS date,
        b.total_amount,
        b.paid_amount,
        (b.total_amount - b.paid_amount) AS balance,
        b.payment_status,
        (SELECT COUNT(*) FROM stock_items WHERE batch_id = b.id) AS item_count,
        b.created_at
      FROM stock_batches b
      LEFT JOIN suppliers s ON b.company_id = s.id
    `;

    const params: string[] = [];
    const conds: string[] = [];

    if (startDate) {
      conds.push("b.purchase_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conds.push("b.purchase_date <= ?");
      params.push(endDate);
    }
    if (search && search.trim()) {
      conds.push("(b.invoice_number LIKE ? OR s.name LIKE ?)");
      const q = `%${search.trim()}%`;
      params.push(q, q);
    }

    if (conds.length > 0) {
      query += " WHERE " + conds.join(" AND ");
    }
    query += " ORDER BY b.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    let totalPurchases = 0;
    rows.forEach((r) => (totalPurchases += r.total_amount || 0));

    return {
      type: "purchases",
      title: "Stock Purchase Batches Report",
      subtitle: `Displaying ${rows.length} inventory purchase receiving batches`,
      columns: [
        { key: "invoice_number", label: "Invoice #" },
        { key: "date", label: "Purchase Date" },
        { key: "supplier_name", label: "Supplier" },
        { key: "item_count", label: "Items Count", align: "center" },
        { key: "total_amount", label: "Total Cost (Rs.)", align: "right" },
        { key: "payment_status", label: "Payment Status", align: "center" },
      ],
      rows,
      summaryMetrics: {
        "Total Batches": rows.length,
        "Total Purchases Cost": `Rs. ${totalPurchases.toLocaleString()}`,
      },
    };
  }

  private getReceivedPaymentsSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        l.id,
        l.date,
        c.name AS customer_name,
        c.phone AS customer_phone,
        COALESCE(l.invoice_number, 'DEBT RETURN') AS invoice_number,
        l.description,
        l.debit AS amount,
        l.balance AS cumulative_balance
      FROM customer_ledger l
      JOIN customers c ON l.customer_id = c.id
      WHERE l.debit > 0
    `;

    const params: string[] = [];

    if (startDate) {
      query += " AND l.date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND l.date <= ?";
      params.push(endDate);
    }
    if (search && search.trim()) {
      query += " AND (c.name LIKE ? OR c.phone LIKE ? OR l.invoice_number LIKE ? OR l.description LIKE ?)";
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q);
    }

    query += " ORDER BY l.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    let totalReceived = 0;
    rows.forEach((r) => (totalReceived += r.amount || 0));

    return {
      type: "received-payments",
      title: "Received Customer Payments Report",
      subtitle: `Displaying ${rows.length} cash collections and debt returns`,
      columns: [
        { key: "date", label: "Payment Date" },
        { key: "customer_name", label: "Customer Name" },
        { key: "invoice_number", label: "Reference / Invoice #" },
        { key: "description", label: "Description" },
        { key: "amount", label: "Amount Received (Rs.)", align: "right" },
        { key: "cumulative_balance", label: "Ledger Balance (Rs.)", align: "right" },
      ],
      rows,
      summaryMetrics: {
        "Total Collections": rows.length,
        "Total Payments Received": `Rs. ${totalReceived.toLocaleString()}`,
      },
    };
  }

  private getOutstandingSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        s.id,
        s.invoice_number,
        s.customer_name,
        s.customer_phone,
        s.sale_date AS date,
        s.total_amount,
        s.paid_amount,
        (s.total_amount - s.paid_amount) AS outstanding_amount,
        s.payment_status
      FROM sales s
      WHERE (s.total_amount - s.paid_amount) > 0
    `;

    const params: string[] = [];

    if (startDate) {
      query += " AND s.sale_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND s.sale_date <= ?";
      params.push(endDate);
    }
    if (search && search.trim()) {
      query += " AND (s.invoice_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)";
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    query += " ORDER BY (s.total_amount - s.paid_amount) DESC, s.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    let totalOutstanding = 0;
    rows.forEach((r) => (totalOutstanding += r.outstanding_amount || 0));

    return {
      type: "outstanding",
      title: "Outstanding Receivables Report",
      subtitle: `Displaying ${rows.length} pending customer invoice balances`,
      columns: [
        { key: "invoice_number", label: "Invoice #" },
        { key: "date", label: "Sale Date" },
        { key: "customer_name", label: "Customer" },
        { key: "total_amount", label: "Invoice Amount (Rs.)", align: "right" },
        { key: "paid_amount", label: "Paid Amount (Rs.)", align: "right" },
        { key: "outstanding_amount", label: "Pending Balance (Rs.)", align: "right" },
        { key: "payment_status", label: "Status", align: "center" },
      ],
      rows,
      summaryMetrics: {
        "Pending Invoices": rows.length,
        "Total Receivables Owed": `Rs. ${totalOutstanding.toLocaleString()}`,
      },
    };
  }

  private getProfitSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        s.id,
        s.invoice_number,
        s.sale_date AS date,
        s.customer_name,
        s.total_amount AS revenue,
        COALESCE((SELECT SUM(si.unit_cost * si.quantity) FROM sale_items si WHERE si.sale_id = s.id), 0) AS total_cost,
        COALESCE((SELECT SUM((si.unit_sale_price - si.unit_cost) * si.quantity) FROM sale_items si WHERE si.sale_id = s.id), 0) AS gross_profit
      FROM sales s
    `;

    const params: string[] = [];
    const conds: string[] = [];

    if (startDate) {
      conds.push("s.sale_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conds.push("s.sale_date <= ?");
      params.push(endDate);
    }
    if (search && search.trim()) {
      conds.push("(s.invoice_number LIKE ? OR s.customer_name LIKE ?)");
      const q = `%${search.trim()}%`;
      params.push(q, q);
    }

    if (conds.length > 0) {
      query += " WHERE " + conds.join(" AND ");
    }
    query += " ORDER BY s.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    let totalRevenue = 0;
    let totalCost = 0;
    let totalGrossProfit = 0;

    rows.forEach((r) => {
      totalRevenue += r.revenue || 0;
      totalCost += r.total_cost || 0;
      totalGrossProfit += r.gross_profit || 0;
    });

    return {
      type: "profit",
      title: "Sales Profitability Breakdown",
      subtitle: `Displaying gross profit margins per sale invoice`,
      columns: [
        { key: "invoice_number", label: "Invoice #" },
        { key: "date", label: "Sale Date" },
        { key: "customer_name", label: "Customer" },
        { key: "revenue", label: "Revenue (Rs.)", align: "right" },
        { key: "total_cost", label: "COGS Cost (Rs.)", align: "right" },
        { key: "gross_profit", label: "Gross Profit (Rs.)", align: "right" },
      ],
      rows,
      summaryMetrics: {
        "Sales Count": rows.length,
        "Total Revenue": `Rs. ${totalRevenue.toLocaleString()}`,
        "Total Cost of Goods": `Rs. ${totalCost.toLocaleString()}`,
        "Total Gross Profit": `Rs. ${totalGrossProfit.toLocaleString()}`,
      },
    };
  }

  private getStockPurchasedSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        si.id,
        sb.invoice_number,
        sb.purchase_date AS date,
        sup.name AS supplier_name,
        p.name AS product_name,
        p.type AS product_type,
        p.size AS product_size,
        si.quantity,
        si.unit_cost,
        si.total_cost
      FROM stock_items si
      JOIN stock_batches sb ON si.batch_id = sb.id
      JOIN products p ON si.product_id = p.id
      LEFT JOIN suppliers sup ON sb.company_id = sup.id
    `;

    const params: string[] = [];
    const conds: string[] = [];

    if (startDate) {
      conds.push("sb.purchase_date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conds.push("sb.purchase_date <= ?");
      params.push(endDate);
    }
    if (search && search.trim()) {
      conds.push("(sb.invoice_number LIKE ? OR sup.name LIKE ? OR p.name LIKE ?)");
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    if (conds.length > 0) {
      query += " WHERE " + conds.join(" AND ");
    }
    query += " ORDER BY si.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    let totalUnits = 0;
    let totalValuation = 0;

    rows.forEach((r) => {
      totalUnits += r.quantity || 0;
      totalValuation += r.total_cost || 0;
    });

    return {
      type: "stock-purchased",
      title: "Itemized Stock Purchased Breakdown",
      subtitle: `Displaying ${rows.length} received stock items`,
      columns: [
        { key: "invoice_number", label: "Batch Invoice #" },
        { key: "date", label: "Date" },
        { key: "supplier_name", label: "Supplier" },
        { key: "product_name", label: "Product Name" },
        { key: "quantity", label: "Quantity Units", align: "center" },
        { key: "unit_cost", label: "Unit Cost (Rs.)", align: "right" },
        { key: "total_cost", label: "Total Cost (Rs.)", align: "right" },
      ],
      rows,
      summaryMetrics: {
        "Item Records": rows.length,
        "Total Purchased Units": totalUnits,
        "Total Purchase Valuation": `Rs. ${totalValuation.toLocaleString()}`,
      },
    };
  }

  private getCustomersSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.location,
        c.created_at AS registration_date,
        (SELECT COUNT(*) FROM sales WHERE customer_id = c.id) AS sales_count,
        COALESCE((SELECT balance FROM customer_ledger WHERE customer_id = c.id ORDER BY id DESC LIMIT 1), 0) AS current_balance
      FROM customers c
    `;

    const params: string[] = [];
    const conds: string[] = [];

    if (startDate) {
      conds.push("date(c.created_at) >= date(?)");
      params.push(startDate);
    }
    if (endDate) {
      conds.push("date(c.created_at) <= date(?)");
      params.push(endDate);
    }
    if (search && search.trim()) {
      conds.push("(c.name LIKE ? OR c.phone LIKE ? OR c.location LIKE ?)");
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    if (conds.length > 0) {
      query += " WHERE " + conds.join(" AND ");
    }
    query += " ORDER BY c.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    return {
      type: "customers",
      title: "Customer Directory & Registrations",
      subtitle: `Displaying ${rows.length} registered customers`,
      columns: [
        { key: "id", label: "ID", align: "center" },
        { key: "name", label: "Customer Name" },
        { key: "phone", label: "Phone Number" },
        { key: "location", label: "Location / Address" },
        { key: "registration_date", label: "Added On" },
        { key: "sales_count", label: "Total Orders", align: "center" },
        { key: "current_balance", label: "Current Debt Balance (Rs.)", align: "right" },
      ],
      rows,
      summaryMetrics: {
        "Registered Customers": rows.length,
      },
    };
  }

  private getSuppliersSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        s.id,
        s.name,
        s.phone,
        s.contact_person,
        s.created_at AS registration_date,
        COALESCE((SELECT balance FROM supplier_ledger WHERE supplier_id = s.id ORDER BY id DESC LIMIT 1), 0) AS current_balance
      FROM suppliers s
    `;

    const params: string[] = [];
    const conds: string[] = [];

    if (startDate) {
      conds.push("date(s.created_at) >= date(?)");
      params.push(startDate);
    }
    if (endDate) {
      conds.push("date(s.created_at) <= date(?)");
      params.push(endDate);
    }
    if (search && search.trim()) {
      conds.push("(s.name LIKE ? OR s.phone LIKE ? OR s.contact_person LIKE ?)");
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    if (conds.length > 0) {
      query += " WHERE " + conds.join(" AND ");
    }
    query += " ORDER BY s.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    return {
      type: "suppliers",
      title: "Supplier Directory & Registrations",
      subtitle: `Displaying ${rows.length} registered vendors/suppliers`,
      columns: [
        { key: "id", label: "ID", align: "center" },
        { key: "name", label: "Company / Vendor Name" },
        { key: "phone", label: "Phone Number" },
        { key: "contact_person", label: "Contact Person" },
        { key: "registration_date", label: "Added On" },
        { key: "current_balance", label: "Current Balance Owed (Rs.)", align: "right" },
      ],
      rows,
      summaryMetrics: {
        "Registered Vendors": rows.length,
      },
    };
  }

  private getSupplierDebtSummary(startDate?: string, endDate?: string, search?: string): SummaryReportResult {
    let query = `
      SELECT 
        sb.id,
        sb.invoice_number,
        sup.name AS supplier_name,
        sup.phone AS supplier_phone,
        sb.purchase_date AS date,
        sb.total_amount,
        sb.paid_amount,
        (sb.total_amount - sb.paid_amount) AS balance_due,
        sb.payment_status
      FROM stock_batches sb
      JOIN suppliers sup ON sb.company_id = sup.id
      WHERE sb.payment_status != 'paid'
    `;

    const params: string[] = [];

    if (startDate) {
      query += " AND sb.purchase_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND sb.purchase_date <= ?";
      params.push(endDate);
    }
    if (search && search.trim()) {
      query += " AND (sup.name LIKE ? OR sup.phone LIKE ? OR sb.invoice_number LIKE ?)";
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    query += " ORDER BY sb.id DESC";

    const rows = db.prepare(query).all(...params) as any[];

    let totalSupplierDebt = 0;
    rows.forEach((r) => (totalSupplierDebt += r.balance_due || 0));

    return {
      type: "supplier-debt",
      title: "Supplier Dues Owed Report",
      subtitle: `Displaying ${rows.length} pending stock purchase batches with unpaid balances`,
      columns: [
        { key: "invoice_number", label: "Invoice #" },
        { key: "supplier_name", label: "Supplier / Vendor" },
        { key: "date", label: "Purchase Date" },
        { key: "total_amount", label: "Total Cost", align: "right" },
        { key: "paid_amount", label: "Paid Amount", align: "right" },
        { key: "balance_due", label: "Dues Owed", align: "right" },
        { key: "payment_status", label: "Status", align: "center" },
      ],
      rows,
      summaryMetrics: {
        "Unpaid Batches": rows.length,
        "Total Dues Owed": `Rs. ${totalSupplierDebt.toLocaleString()}`,
      },
    };
  }
}

export const summaryService = new SummaryService();
