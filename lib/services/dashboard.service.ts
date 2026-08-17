import db from "@/lib/db";
import { getCurrentMonthStartDate, getCurrentMonthEndDate } from "@/lib/utils/date";
import { invoiceSettingsService } from "@/lib/services/invoice_settings.service";

export interface DashboardMetrics {
  // Current Month Metrics
  currentMonthSalesRevenue: number;
  currentMonthSalesCount: number;

  currentMonthPurchasesTotal: number;
  currentMonthPurchasesCount: number;

  currentMonthReceivedPayments: number;
  currentMonthOutstanding: number;      // Customer debt owed to us
  currentMonthSupplierDebt: number;     // Supplier dues owed by us

  currentMonthGrossProfit: number;
  currentMonthExpenses: number;
  currentMonthProfit: number;

  currentMonthStockPurchasedUnits: number;
  currentMonthCustomersAdded: number;
  currentMonthSuppliersAdded: number;

  // Manual Operational Expenses Breakdown
  currentMonthCategoryExpenses: Array<{
    category: string;
    amount: number;
  }>;

  // Additional Operational Overview
  lowStockCount: number;
  lowStockProducts: Array<{
    id: number;
    name: string;
    size: string;
    type: string;
    quantity: number;
    retail_price: number;
  }>;
  recentStockBatches: Array<{
    id: number;
    invoice_number: string;
    supplier_name: string;
    purchase_date: string;
    total_amount: number;
    payment_status: string;
  }>;
}

export const dashboardService = {
  getMetrics(): DashboardMetrics {
    const monthStart = getCurrentMonthStartDate();
    const monthEnd = getCurrentMonthEndDate();

    // 1. Current Month Sales (Revenue, Count, Paid Amount)
    const salesRow = db
      .prepare(
        `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as totalRevenue,
        COALESCE(SUM(paid_amount), 0) as totalPaid
      FROM sales
      WHERE sale_date >= ? AND sale_date <= ?
    `
      )
      .get(monthStart, monthEnd) as { count: number; totalRevenue: number; totalPaid: number };

    const currentMonthSalesCount = salesRow?.count || 0;
    const currentMonthSalesRevenue = salesRow?.totalRevenue || 0;
    const currentMonthSalesPaid = salesRow?.totalPaid || 0;
    const currentMonthOutstanding = Math.max(0, currentMonthSalesRevenue - currentMonthSalesPaid);

    // 2. Current Month Purchases & Current Month Supplier Dues Owed
    const purchasesRow = db
      .prepare(
        `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as totalPurchases,
        COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN (total_amount - paid_amount) ELSE 0 END), 0) as totalSupplierDebt
      FROM stock_batches
      WHERE purchase_date >= ? AND purchase_date <= ?
    `
      )
      .get(monthStart, monthEnd) as { count: number; totalPurchases: number; totalSupplierDebt: number };

    const currentMonthPurchasesCount = purchasesRow?.count || 0;
    const currentMonthPurchasesTotal = purchasesRow?.totalPurchases || 0;
    const currentMonthSupplierDebt = Math.max(0, purchasesRow?.totalSupplierDebt || 0);

    // 3. Current Month Received Payments (Payments received from customer debt returns & sales)
    const ledgerPaymentsRow = db
      .prepare(
        `
      SELECT COALESCE(SUM(debit), 0) as totalLedgerDebit
      FROM customer_ledger
      WHERE date >= ? AND date <= ? AND debit > 0 AND sale_id IS NULL
    `
      )
      .get(monthStart, monthEnd) as { totalLedgerDebit: number };

    const currentMonthReceivedPayments = currentMonthSalesPaid + (ledgerPaymentsRow?.totalLedgerDebit || 0);

    // 4. Current Month Gross Profit & Net Profit
    const profitRow = db
      .prepare(
        `
      SELECT 
        COALESCE(SUM((si.unit_sale_price - si.unit_cost) * si.quantity), 0) as grossProfit
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.sale_date >= ? AND s.sale_date <= ?
    `
      )
      .get(monthStart, monthEnd) as { grossProfit: number };

    const currentMonthGrossProfit = profitRow?.grossProfit || 0;

    const expenseRow = db
      .prepare(
        `
      SELECT COALESCE(SUM(amount), 0) as totalExpenses
      FROM expenses
      WHERE category != 'Stock Purchase' AND date >= ? AND date <= ?
    `
      )
      .get(monthStart, monthEnd) as { totalExpenses: number };

    const currentMonthExpenses = expenseRow?.totalExpenses || 0;
    const currentMonthProfit = currentMonthGrossProfit - currentMonthExpenses;

    // Operational Expense Category Breakdown (excluding Stock Purchase)
    const currentMonthCategoryExpenses = db
      .prepare(
        `
      SELECT category, COALESCE(SUM(amount), 0) as amount
      FROM expenses
      WHERE category != 'Stock Purchase' AND date >= ? AND date <= ?
      GROUP BY category
      ORDER BY amount DESC
    `
      )
      .all(monthStart, monthEnd) as Array<{ category: string; amount: number }>;

    // 5. Current Month Stock Purchased (Units received)
    const stockUnitsRow = db
      .prepare(
        `
      SELECT COALESCE(SUM(si.quantity), 0) as totalUnits
      FROM stock_items si
      JOIN stock_batches sb ON si.batch_id = sb.id
      WHERE sb.purchase_date >= ? AND sb.purchase_date <= ?
    `
      )
      .get(monthStart, monthEnd) as { totalUnits: number };

    const currentMonthStockPurchasedUnits = stockUnitsRow?.totalUnits || 0;

    // 6. Current Month Customers Added
    const customersRow = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM customers
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    `
      )
      .get(monthStart, monthEnd) as { count: number };

    const currentMonthCustomersAdded = customersRow?.count || 0;

    // 7. Current Month Suppliers Added
    const suppliersRow = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM suppliers
      WHERE date(created_at) >= date(?) AND date(created_at) <= date(?)
    `
      )
      .get(monthStart, monthEnd) as { count: number };

    const currentMonthSuppliersAdded = suppliersRow?.count || 0;

    const minStockLimit = invoiceSettingsService.getInvoiceSettings().minStockWarning || 5;

    // 8. Low Stock Count
    const productStats = db
      .prepare(
        `
      SELECT COALESCE(SUM(CASE WHEN quantity <= ? THEN 1 ELSE 0 END), 0) as lowQtyCount
      FROM products
    `
      )
      .get(minStockLimit) as { lowQtyCount: number };

    const lowStockCount = productStats?.lowQtyCount || 0;

    // Low Stock Products
    const lowStockProducts = db
      .prepare(
        `
      SELECT id, name, size, type, quantity, retail_price
      FROM products
      WHERE quantity <= ?
      ORDER BY quantity ASC
      LIMIT 10
    `
      )
      .all(minStockLimit) as DashboardMetrics["lowStockProducts"];

    // Recent Stock Batches
    const recentStockBatches = db
      .prepare(
        `
      SELECT sb.id, sb.invoice_number, s.name as supplier_name, sb.purchase_date, sb.total_amount, sb.payment_status
      FROM stock_batches sb
      JOIN suppliers s ON sb.company_id = s.id
      ORDER BY sb.id DESC
      LIMIT 5
    `
      )
      .all() as DashboardMetrics["recentStockBatches"];

    return {
      currentMonthSalesRevenue,
      currentMonthSalesCount,
      currentMonthPurchasesTotal,
      currentMonthPurchasesCount,
      currentMonthReceivedPayments,
      currentMonthOutstanding,
      currentMonthSupplierDebt,
      currentMonthGrossProfit,
      currentMonthExpenses,
      currentMonthProfit,
      currentMonthCategoryExpenses,
      currentMonthStockPurchasedUnits,
      currentMonthCustomersAdded,
      currentMonthSuppliersAdded,
      lowStockCount,
      lowStockProducts,
      recentStockBatches,
    };
  },
};
