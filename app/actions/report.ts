"use server";

import { reportService } from "@/lib/services/report.service";

export async function downloadReportAction(
  reportType: "customer-ledger" | "product-purchases" | "product-sales" | "supplier-ledger"
): Promise<{ success: boolean; filename: string; csvContent: string; message?: string }> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let csvContent = "";
    let filename = "";

    switch (reportType) {
      case "customer-ledger":
        csvContent = reportService.getMonthlyCustomerLedgerCSV();
        filename = `Monthly_Customer_Ledger_Statement_${currentMonth}.csv`;
        break;
      case "product-purchases":
        csvContent = reportService.getMonthlyProductPurchasesCSV();
        filename = `Monthly_Product_Purchases_Report_${currentMonth}.csv`;
        break;
      case "product-sales":
        csvContent = reportService.getMonthlyProductSalesCSV();
        filename = `Monthly_Product_Sales_Report_${currentMonth}.csv`;
        break;
      case "supplier-ledger":
        csvContent = reportService.getMonthlySupplierLedgerCSV();
        filename = `Monthly_Supplier_Ledger_Statement_${currentMonth}.csv`;
        break;
      default:
        return { success: false, filename: "", csvContent: "", message: "Invalid report type." };
    }

    return {
      success: true,
      filename,
      csvContent,
    };
  } catch (error: any) {
    return {
      success: false,
      filename: "",
      csvContent: "",
      message: error?.message || "Failed to generate report.",
    };
  }
}
