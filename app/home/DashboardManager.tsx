"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DashboardMetrics } from "@/lib/services/dashboard.service";
import { downloadReportAction } from "@/app/actions/report";
import { useI18n } from "@/lib/i18n-context";
import Toast from "@/app/components/Toast";
import theme from "@/theme";
import {
  Watermark,
  StatCard,
  Card,
  Badge,
} from "@/ui";
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  Building2,
  ChevronRight,
  ShieldAlert,
  FileSpreadsheet,
  AlertTriangle,
  Receipt,
  Tag,
} from "lucide-react";

interface DashboardManagerProps {
  metrics: DashboardMetrics;
  username: string;
}

export default function DashboardManager({ metrics, username }: DashboardManagerProps) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const formatPKR = (amount: number) => {
    return `Rs. ${amount.toLocaleString("en-PK", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const handleDownloadReport = (
    type: "customer-ledger" | "product-purchases" | "product-sales" | "supplier-ledger"
  ) => {
    startTransition(async () => {
      const res = await downloadReportAction(type);
      if (res.success && res.csvContent) {
        const blob = new Blob([res.csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToastMsg(`Downloaded ${res.filename} successfully!`);
      } else {
        setToastMsg(res.message || "Failed to generate report.");
      }
    });
  };

  const renderViewAllLink = (href: string) => (
    <Link
      href={href}
      className="text-xs font-semibold text-[#19444f] hover:text-[#113038] hover:underline flex items-center gap-0.5 cursor-pointer"
    >
      <span>{t("common.details")}</span>
      <ChevronRight className="w-3.5 h-3.5" />
    </Link>
  );

  return (
    <div className="h-full max-h-full flex flex-col p-2.5 overflow-hidden max-w-full space-y-2.5">
      <Toast
        message={toastMsg}
        type={toastMsg?.includes("Failed") ? "error" : "success"}
        onClose={() => setToastMsg(null)}
        duration={4000}
      />

      {/* 6 Current Month KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
        {/* Card 1: Current Month Sales */}
        <StatCard
          title={t("summary_cards.monthly_sales")}
          value={formatPKR(metrics.currentMonthSalesRevenue)}
          icon={<TrendingUp className="w-4 h-4 text-[#19444f]" />}
          subtitle={`${metrics.currentMonthSalesCount} Invoices`}
          action={renderViewAllLink("/summary?type=sales")}
        />

        {/* Card 2: Current Month Purchases */}
        <StatCard
          title={t("summary_cards.stock_value")}
          value={formatPKR(metrics.currentMonthPurchasesTotal)}
          icon={<ShoppingCart className="w-4 h-4 text-[#19444f]" />}
          subtitle={`${metrics.currentMonthPurchasesCount} Stock Batches`}
          action={renderViewAllLink("/summary?type=purchases")}
        />

        {/* Card 3: Current Month Received Payments */}
        <StatCard
          title={t("summary_cards.total_revenue")}
          value={formatPKR(metrics.currentMonthReceivedPayments)}
          icon={<DollarSign className="w-4 h-4 text-emerald-700" />}
          subtitle="Collections & Debt Returns"
          action={renderViewAllLink("/summary?type=received-payments")}
        />

        {/* Card 4: Current Month Customer Debts */}
        <StatCard
          title={t("summary_cards.customer_receivables")}
          value={formatPKR(metrics.currentMonthOutstanding)}
          icon={<AlertTriangle className="w-4 h-4 text-[#ba1a1a]" />}
          subtitle="Unpaid Customer Invoices"
          trendType="negative"
          action={renderViewAllLink("/summary?type=outstanding")}
        />

        {/* Card 5: Current Month Supplier Dues */}
        <StatCard
          title={t("summary_cards.supplier_payables")}
          value={formatPKR(metrics.currentMonthSupplierDebt)}
          icon={<Building2 className="w-4 h-4 text-[#ba1a1a]" />}
          subtitle="Unpaid Stock Batches"
          trendType="negative"
          action={renderViewAllLink("/summary?type=supplier-debt")}
        />

        {/* Card 6: Current Month Stock Purchased */}
        <StatCard
          title={t("summary_cards.available_stock_qty")}
          value={`${metrics.currentMonthStockPurchasedUnits} Units`}
          icon={<Package className="w-4 h-4 text-[#19444f]" />}
          subtitle="Received Quantity"
          action={renderViewAllLink("/summary?type=stock-purchased")}
        />
      </div>

      {/* Main Content Layout: 3 Expanded Cards for Operational Expenses, Low Stock Watchlist & Reports */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-2.5 overflow-hidden">
        {/* Card 1: Operational Expenses & Profit Breakdown */}
        <Card className="flex flex-col h-full overflow-hidden">
          <div className="p-2.5 border-b border-[#e0e3e5] flex items-center justify-between bg-[#f2f4f6]/60 shrink-0">
            <h3 className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5 uppercase tracking-wider">
              <Receipt className="w-3.5 h-3.5 text-[#19444f]" />
              {t("app.expenses")} & {t("summary_cards.net_profit")}
            </h3>
            <Link
              href="/expenses"
              className="text-xs font-semibold text-[#19444f] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{t("common.details")}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick Metrics Comparison Bar */}
          <div className="p-2.5 bg-slate-50 border-b border-[#e0e3e5] grid grid-cols-3 gap-2 text-center shrink-0">
            <div className="p-1.5 bg-white rounded border border-[#e0e3e5]">
              <div className="text-[10px] text-[#71787b] font-semibold uppercase">{t("summary_cards.total_expenses")}</div>
              <div className="text-xs font-extrabold text-rose-600 mt-0.5">
                {formatPKR(metrics.currentMonthExpenses)}
              </div>
            </div>
            <div className="p-1.5 bg-white rounded border border-[#e0e3e5]">
              <div className="text-[10px] text-[#71787b] font-semibold uppercase">{t("summary_cards.total_revenue")}</div>
              <div className="text-xs font-extrabold text-[#191c1e] mt-0.5">
                {formatPKR(metrics.currentMonthGrossProfit)}
              </div>
            </div>
            <div className="p-1.5 bg-white rounded border border-[#e0e3e5]">
              <div className="text-[10px] text-[#71787b] font-semibold uppercase">{t("summary_cards.net_profit")}</div>
              <div className={`text-xs font-extrabold mt-0.5 ${metrics.currentMonthProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {formatPKR(metrics.currentMonthProfit)}
              </div>
            </div>
          </div>

          {/* Category-wise Expenses Body */}
          <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-[#e0e3e5] p-1">
            {metrics.currentMonthCategoryExpenses.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#71787b]">
                {t("common.no_data")}
              </div>
            ) : (
              metrics.currentMonthCategoryExpenses.map((item) => (
                <div
                  key={item.category}
                  className="p-2 px-3 flex items-center justify-between hover:bg-[#f2f4f6]/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-[#eceef0] text-[#19444f]">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-[#191c1e] text-xs">{item.category}</div>
                      <div className="text-[10px] text-[#71787b]">{t("common.description")}</div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-xs text-[#191c1e]">
                    Rs. {item.amount.toLocaleString("en-PK", { minimumFractionDigits: 0 })}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Card 2: Low Stock Watchlist */}
        <Card className="flex flex-col h-full overflow-hidden">
          <div className="p-2.5 border-b border-[#e0e3e5] flex items-center justify-between bg-[#fffbeb] shrink-0">
            <h3 className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-[#92400e]" />
              {t("summary_cards.low_stock_count")}
            </h3>
            <Badge variant="warning" size="sm">
              {metrics.lowStockCount} Items
            </Badge>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0 divide-y divide-[#e0e3e5] p-1">
            {metrics.lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#71787b]">
                {t("common.no_data")}
              </div>
            ) : (
              metrics.lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-2 px-3 flex items-center justify-between hover:bg-[#f2f4f6]/60 transition-colors"
                >
                  <div>
                    <div className="font-bold text-[#191c1e] text-xs">{prod.name}</div>
                    <div className="text-[10px] text-[#71787b]">
                      {prod.type} • {prod.size}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={prod.quantity === 0 ? "danger" : "warning"}
                      size="xs"
                    >
                      {prod.quantity} Left
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Card 3: Download Excel Reports Center */}
        <Card className="flex flex-col h-full overflow-hidden bg-slate-50">
          <div className="p-2.5 border-b border-[#e0e3e5] flex items-center justify-between bg-white shrink-0">
            <h3 className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5 uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#19444f]" />
              {t("app.reports")} ({t("common.export")})
            </h3>
          </div>

          <div className="p-3 flex-1 min-h-0 overflow-y-auto space-y-2">
            <button
              onClick={() => handleDownloadReport("product-sales")}
              disabled={isPending}
              className="w-full p-2.5 bg-white border border-[#e0e3e5] hover:border-[#19444f] rounded-lg text-left transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-[#191c1e] group-hover:text-[#19444f]">
                  {t("headers.products")} {t("app.reports")}
                </div>
                <div className="text-[10px] text-[#71787b]">{t("common.export")} (CSV / Excel)</div>
              </div>
              <FileSpreadsheet className="w-4 h-4 text-[#71787b] group-hover:text-[#19444f]" />
            </button>

            <button
              onClick={() => handleDownloadReport("customer-ledger")}
              disabled={isPending}
              className="w-full p-2.5 bg-white border border-[#e0e3e5] hover:border-[#19444f] rounded-lg text-left transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-[#191c1e] group-hover:text-[#19444f]">
                  {t("ledgers.customer_ledger")} {t("app.reports")}
                </div>
                <div className="text-[10px] text-[#71787b]">{t("common.export")} (CSV / Excel)</div>
              </div>
              <FileSpreadsheet className="w-4 h-4 text-[#71787b] group-hover:text-[#19444f]" />
            </button>

            <button
              onClick={() => handleDownloadReport("supplier-ledger")}
              disabled={isPending}
              className="w-full p-2.5 bg-white border border-[#e0e3e5] hover:border-[#19444f] rounded-lg text-left transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
            >
              <div>
                <div className="text-xs font-bold text-[#191c1e] group-hover:text-[#19444f]">
                  {t("ledgers.supplier_ledger")} {t("app.reports")}
                </div>
                <div className="text-[10px] text-[#71787b]">{t("common.export")} (CSV / Excel)</div>
              </div>
              <FileSpreadsheet className="w-4 h-4 text-[#71787b] group-hover:text-[#19444f]" />
            </button>
          </div>
        </Card>
      </div>
      <Watermark variant="page" />
    </div>
  );
}
