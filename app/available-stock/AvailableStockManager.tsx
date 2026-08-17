"use client";

import { useState, useMemo, useEffect } from "react";
import { AvailableStockRecord } from "@/lib/types/stock";
import { Supplier } from "@/lib/types/supplier";
import { Product } from "@/lib/types/product";
import SearchableSelect, { SelectOption } from "@/app/components/SearchableSelect";
import { useI18n } from "@/lib/i18n-context";
import theme from "@/theme";
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableContainer,
  PageHeader,
  FilterBar,
  Badge,
  Watermark,
} from "@/ui";
import {
  Boxes,
  Search,
  Printer,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  DollarSign,
  PackageCheck,
  RefreshCw,
  FileText,
  Percent,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

interface AvailableStockManagerProps {
  initialRecords: AvailableStockRecord[];
  suppliers: Supplier[];
  products: Product[];
}

export default function AvailableStockManager({
  initialRecords,
  suppliers,
  products,
}: AvailableStockManagerProps) {
  const { t } = useI18n();
  const [records, setRecords] = useState<AvailableStockRecord[]>(initialRecords);

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Pagination State (6 entries per page)
  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSupplierId, selectedProductId, fromDate, toDate]);

  const supplierSelectOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "", label: "All Suppliers" },
      ...suppliers.map((s) => ({
        value: String(s.id),
        label: s.name,
        sublabel: s.phone ? `Phone: ${s.phone}` : undefined,
      })),
    ];
  }, [suppliers]);

  const productSelectOptions: SelectOption[] = useMemo(() => {
    return [
      { value: "", label: "All Products" },
      ...products.map((p) => ({
        value: String(p.id),
        label: p.name,
        sublabel: `${p.type} - ${p.size} • RP: Rs. ${p.retail_price.toLocaleString()}`,
      })),
    ];
  }, [products]);

  // Product Total Units & Distinct Rate Tiers Map
  const productTotalUnits = useMemo(() => {
    const map: Record<number, { totalUnits: number; distinctRatesCount: number }> = {};
    const ratesMap: Record<number, Set<string>> = {};

    records.forEach((r) => {
      if (!map[r.product_id]) {
        map[r.product_id] = { totalUnits: 0, distinctRatesCount: 0 };
        ratesMap[r.product_id] = new Set();
      }
      map[r.product_id].totalUnits += r.current_available_qty;
      const rateKey = `${r.unit_retail_price.toFixed(2)}_${r.unit_discount_percent.toFixed(2)}`;
      ratesMap[r.product_id].add(rateKey);
    });

    Object.keys(map).forEach((pidStr) => {
      const pid = Number(pidStr);
      map[pid].distinctRatesCount = ratesMap[pid].size;
    });

    return map;
  }, [records]);

  // Filtered Records Calculation
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.product_name.toLowerCase().includes(q);
        const matchesType = r.product_type.toLowerCase().includes(q);
        const matchesSize = r.product_size.toLowerCase().includes(q);
        const matchesSupplier = r.supplier_name.toLowerCase().includes(q);
        const matchesInvoice = r.invoice_number.toLowerCase().includes(q);

        if (
          !matchesName &&
          !matchesType &&
          !matchesSize &&
          !matchesSupplier &&
          !matchesInvoice
        ) {
          return false;
        }
      }

      // Supplier filter
      if (selectedSupplierId && String(r.company_id) !== selectedSupplierId) {
        return false;
      }

      // Product filter
      if (selectedProductId && String(r.product_id) !== selectedProductId) {
        return false;
      }

      // Date range filter
      if (fromDate && r.purchase_date && r.purchase_date < fromDate) {
        return false;
      }
      if (toDate && r.purchase_date && r.purchase_date > toDate) {
        return false;
      }

      return true;
    });
  }, [records, searchQuery, selectedSupplierId, selectedProductId, fromDate, toDate]);

  // Total pages calculation
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE) || 1;

  // Paginated records slice
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(searchQuery || selectedSupplierId || selectedProductId || fromDate || toDate);
  }, [searchQuery, selectedSupplierId, selectedProductId, fromDate, toDate]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalQty = 0;
    let totalValue = 0;
    let totalCost = 0;
    let totalProfitMargin = 0;

    filteredRecords.forEach((r) => {
      totalQty += r.current_available_qty;
      totalValue += r.total_stock_value;
      totalCost += r.total_stock_cost;
      totalProfitMargin += r.total_potential_profit;
    });

    return {
      totalQty,
      totalValue: totalValue.toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalProfitMargin: totalProfitMargin.toFixed(2),
    };
  }, [filteredRecords]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSupplierId("");
    setSelectedProductId("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  // Print Handler
  const handlePrint = () => {
    const rowsHtml = filteredRecords
      .map((r) => `
        <tr>
          <td>${r.product_name}<br/><small>Type: ${r.product_type} â€¢ Size: ${r.product_size}</small></td>
          <td>${r.supplier_name}</td>
          <td class="text-center">${r.current_available_qty}</td>
          <td class="text-right">Rs. ${r.unit_retail_price.toFixed(2)}</td>
          <td class="text-center"><span>${r.unit_discount_percent}</span></td>
          <td class="text-right">Rs. ${r.unit_cost.toFixed(2)}</td>
          <td class="text-right">+ Rs. ${r.unit_margin.toFixed(2)}</td>
          <td class="text-right">Rs. ${r.total_potential_profit.toFixed(2)}</td>
        </tr>`
      )
      .join('');

    const html = `
      <html>
        <head>
          <title>Available Stock Full Report</title>
          <style>
            body{font-family:system-ui,sans-serif;padding:1rem;}
            table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #e2e8f0;padding:0.5rem;text-align:left;}
            th{background:#f1f5f9;}
          </style>
        </head>
        <body>
          <h2>Available Stock - Full Report</h2>
          <table>
            <thead>
              <tr>
                <th>Product Name & Specs</th><th>Supplier</th><th>Avail Qty</th><th>Retail Price (RP)</th><th>Discount %</th><th>Unit Cost</th><th>Unit Margin</th><th>Total Profit</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>`;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
      newWindow.print();
      newWindow.close();
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      "Product Name",
      "Type",
      "Size",
      "Supplier",
      "Purchase Date",
      "Invoice #",
      "Available Qty (Units)",
      "Retail Price (RP)",
      "Discount %",
      "Unit Cost",
      "Unit Margin (Profit)",
      "Total Stock Value",
      "Total Stock Cost",
      "Total Potential Profit",
    ];

    const csvRows = filteredRecords.map((r) => [
      `"${r.product_name}"`,
      `"${r.product_type}"`,
      `"${r.product_size}"`,
      `"${r.supplier_name}"`,
      `"${r.purchase_date}"`,
      `"${r.invoice_number}"`,
      `"${r.current_available_qty} (${r.current_available_qty} units)"`,
      r.unit_retail_price,
      `${r.unit_discount_percent}`,
      r.unit_cost,
      r.unit_margin,
      r.total_stock_value,
      r.total_stock_cost,
      r.total_potential_profit,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Available_Stock_Full_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full space-y-2.5">
      {/* Top Header & Report Actions */}
      <PageHeader
        title={t("headers.available_stock")}
        icon={<Boxes className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              {t("common.export")} CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              {t("common.print")}
            </Button>
          </div>
        }
      />

      {/* Analytics Summary Cards (Visible only when printed) */}
      <div className="hidden print:grid grid-cols-4 gap-2 mb-4">
        {/* Card 1: Available Stock Quantity */}
        <div className="bg-white p-3 rounded-lg shadow-xs flex items-center justify-between" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
          <div>
            <span className="text-[11px] font-medium block" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("stock.available_units")}
            </span>
            <span className="text-lg font-bold mt-0.5 block" style={{ color: theme.colors.onSurface }}>
              {metrics.totalQty} <span className="text-xs font-normal" style={{ color: theme.colors.textMuted }}>units</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${theme.colors.brandBg}66`, color: theme.colors.primary }}>
            <PackageCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Total Stock Value (RP) */}
        <div className="bg-white p-3 rounded-lg shadow-xs flex items-center justify-between" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
          <div>
            <span className="text-[11px] font-medium block" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("stock.total_stock_value")}
            </span>
            <span className="text-lg font-bold mt-0.5 block" style={{ color: theme.colors.onSurface }}>
              Rs. {metrics.totalValue}
            </span>
          </div>
          <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Total Stock Purchase Cost */}
        <div className="bg-white p-3 rounded-lg shadow-xs flex items-center justify-between" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
          <div>
            <span className="text-[11px] font-medium block" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("stock.total_stock_cost")}
            </span>
            <span className="text-lg font-bold mt-0.5 block" style={{ color: theme.colors.onSurface }}>
              Rs. {metrics.totalCost}
            </span>
          </div>
          <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Potential Profit Margin */}
        <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 block">
              {t("stock.total_expected_profit")}
            </span>
            <span className="text-lg font-extrabold text-emerald-700 mt-0.5 block">
              Rs. {metrics.totalProfitMargin}
            </span>
          </div>
          <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <FilterBar className="print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          {/* Search Query */}
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Product name, invoice..."
            leftIcon={<Search className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />

          {/* Supplier Filter */}
          <div>
            <SearchableSelect
              options={supplierSelectOptions}
              value={selectedSupplierId}
              onChange={(val) => setSelectedSupplierId(val)}
              placeholder="All Suppliers"
            />
          </div>

          {/* Product Filter */}
          <div>
            <SearchableSelect
              options={productSelectOptions}
              value={selectedProductId}
              onChange={(val) => setSelectedProductId(val)}
              placeholder="All Products"
            />
          </div>

          {/* From Date */}
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />

          {/* To Date & Reset */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                leftIcon={<Calendar className="w-3.5 h-3.5" />}
                sizeVariant="sm"
              />
            </div>

            {isAnyFilterActive && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleResetFilters}
                leftIcon={<RotateCcw className="w-3 h-3" />}
                title="Reset Filters"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </FilterBar>

      {/* Available Stock Data Table */}
      <TableContainer className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between print:border-none print:shadow-none">
        <div className="flex-1 overflow-y-auto min-h-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>{t("stock.product_specs")}</TableHead>
                <TableHead>{t("table.supplier_name")}</TableHead>
                <TableHead className="text-center">{t("table.available_qty")}</TableHead>
                <TableHead className="text-right">{t("table.retail_price")}</TableHead>
                <TableHead className="text-center">{t("table.discount_pct")}</TableHead>
                <TableHead className="text-right">{t("table.cost_price")}</TableHead>
                <TableHead className="text-right">{t("stock.unit_margin")}</TableHead>
                <TableHead className="text-right">{t("stock.total_profit")}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-4 py-8 text-center" style={{ color: theme.colors.textMuted }}>
                    <Boxes className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p>No available stock records match your criteria.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRecords.map((r, index) => {
                  const summary = productTotalUnits[r.product_id];
                  const hasMultipleDiscounts = summary && summary.distinctRatesCount > 1;

                  return (
                    <TableRow key={`stock-item-${r.item_id || "item"}-${r.batch_id || "batch"}-${index}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold" style={{ color: theme.colors.onSurface }}>
                            {r.product_name}
                          </span>
                          <span className="text-[11px]" style={{ color: theme.colors.textMuted }}>
                            Type: {r.product_type} â€¢ Size: {r.product_size}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell style={{ color: theme.colors.onSurfaceVariant }}>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: theme.colors.primary }} />
                          <span>{r.supplier_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <Badge variant="brand" size="sm">
                            {r.current_available_qty}
                          </Badge>
                          {hasMultipleDiscounts && (
                            <Badge variant="warning" size="sm" title={`Total ${summary.totalUnits} units of this product available across ${summary.distinctRatesCount} different discount rates`}>
                              Total: {summary.totalUnits} ({summary.distinctRatesCount} rates)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold" style={{ color: theme.colors.onSurface }}>
                        Rs. {r.unit_retail_price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" size="sm">
                          <Percent className="w-2.5 h-2.5 mr-0.5 text-indigo-600" />
                          {r.unit_discount_percent}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold" style={{ color: theme.colors.onSurfaceVariant }}>
                        Rs. {r.unit_cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        + Rs. {r.unit_margin.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-emerald-800">
                        Rs. {r.total_potential_profit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Screen Pagination Controls */}
        <div className="p-2 border-t flex items-center justify-between text-xs shrink-0 print:hidden" style={{ backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.surfaceContainerHighest, color: theme.colors.onSurfaceVariant }}>
          <div>
            Showing{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {filteredRecords.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)}
            </span>{" "}
            of <span className="font-bold" style={{ color: theme.colors.onSurface }}>{filteredRecords.length}</span> stock entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>

            <span className="px-2 font-bold" style={{ color: theme.colors.onSurface }}>
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="secondary"
              size="xs"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </TableContainer>
      <Watermark variant="page" />
    </div>
  );
}
