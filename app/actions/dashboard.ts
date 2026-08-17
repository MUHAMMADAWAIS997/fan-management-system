"use server";

import { dashboardService, DashboardMetrics } from "@/lib/services/dashboard.service";

export async function getDashboardMetricsAction(): Promise<DashboardMetrics> {
  try {
    return dashboardService.getMetrics();
  } catch (error: any) {
    console.error("Failed to fetch dashboard metrics:", error);
    return {
      currentMonthSalesRevenue: 0,
      currentMonthSalesCount: 0,
      currentMonthPurchasesTotal: 0,
      currentMonthPurchasesCount: 0,
      currentMonthReceivedPayments: 0,
      currentMonthOutstanding: 0,
      currentMonthSupplierDebt: 0,
      currentMonthGrossProfit: 0,
      currentMonthExpenses: 0,
      currentMonthProfit: 0,
      currentMonthCategoryExpenses: [],
      currentMonthStockPurchasedUnits: 0,
      currentMonthCustomersAdded: 0,
      currentMonthSuppliersAdded: 0,
      lowStockCount: 0,
      lowStockProducts: [],
      recentStockBatches: [],
    };
  }
}
