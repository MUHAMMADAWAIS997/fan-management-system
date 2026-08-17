"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import theme from "@/theme";
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Calendar,
  FileText,
  DollarSign,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
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
} from "@/ui";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";
import { getAllSalesAction } from "@/app/actions/sale";

import { Sale, SaleItem } from "@/lib/types/sale";

export type SaleRecordItem = SaleItem;
export type SaleRecord = Sale;

interface SalesManagerProps {
  initialSales?: Sale[];
  sales?: Sale[];
}

export default function SalesManager({ initialSales, sales: legacySales }: SalesManagerProps) {
  const [sales, setSales] = useState<Sale[]>(initialSales || legacySales || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState(getDefaultStartDate(60));
  const [endDate, setEndDate] = useState(getDefaultEndDate());

  // Refetch sales from SQLite via Server Action when date bounds change
  useEffect(() => {
    let isMounted = true;
    getAllSalesAction(startDate || undefined, endDate || undefined).then((data) => {
      if (isMounted) {
        setSales(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [startDate, endDate]);

  // Pagination State (7 entries per page)
  const ITEMS_PER_PAGE = 7;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, paymentStatusFilter, startDate, endDate]);

  // Aggregate Metrics for Header
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let totalReceived = 0;

    sales.forEach((s) => {
      totalRevenue += s.total_amount;
      totalReceived += s.paid_amount;
    });

    const totalOutstanding = Math.max(0, totalRevenue - totalReceived);

    return {
      totalSalesCount: sales.length,
      totalRevenue,
      totalReceived,
      totalOutstanding,
    };
  }, [sales]);

  // Filter Sales Logic
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // 1. Search Query (Matches Invoice Number, Customer Name, or Phone)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesInvoice = sale.invoice_number.toLowerCase().includes(query);
        const matchesName = sale.customer_name.toLowerCase().includes(query);
        const matchesPhone = sale.customer_phone
          ? sale.customer_phone.toLowerCase().includes(query)
          : false;

        if (!matchesInvoice && !matchesName && !matchesPhone) {
          return false;
        }
      }

      // 2. Payment Status Filter
      if (paymentStatusFilter !== "all" && sale.payment_status !== paymentStatusFilter) {
        return false;
      }

      // 3. Start Date Filter
      if (startDate && sale.sale_date < startDate) {
        return false;
      }

      // 4. End Date Filter
      if (endDate && sale.sale_date > endDate) {
        return false;
      }

      return true;
    });
  }, [sales, searchQuery, paymentStatusFilter, startDate, endDate]);

  // Total pages based on filtered records
  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE) || 1;

  // Screen Paginated Slice (7 records)
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSales.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSales, currentPage]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(searchQuery || paymentStatusFilter !== "all" || startDate || endDate);
  }, [searchQuery, paymentStatusFilter, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setPaymentStatusFilter("all");
    setStartDate(getDefaultStartDate(60));
    setEndDate(getDefaultEndDate());
  };

  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      "Invoice #",
      "Sale Date",
      "Customer Name",
      "Phone",
      "Items Count",
      "Total Amount",
      "Paid Amount",
      "Balance Owed",
      "Payment Status",
    ];

    const csvRows = filteredSales.map((s) => [
      `"${(s.invoice_number || "").replace(/"/g, '""')}"`,
      `"${(s.sale_date || "").replace(/"/g, '""')}"`,
      `"${(s.customer_name || "").replace(/"/g, '""')}"`,
      `"${(s.customer_phone || "").replace(/"/g, '""')}"`,
      s.item_count || 1,
      s.total_amount,
      s.paid_amount,
      Math.max(0, s.total_amount - s.paid_amount),
      `"${(s.payment_status || "").replace(/"/g, '""')}"`,
    ]);

    const csvString = [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Sales_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string, balanceDue: number) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            Partial (Rs. {balanceDue.toFixed(0)} due)
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="danger" size="sm">
            <AlertCircle className="w-3 h-3 mr-1" />
            Unpaid
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" size="sm">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full space-y-2.5">
      {/* Header Section */}
      <PageHeader
        title="Sale Records & Invoices"
        icon={<ShoppingBag className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
            <Link href="/sales/add">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Record Sale
              </Button>
            </Link>
          </div>
        }
      />

      {/* Analytics Metric Cards (Visible only when printed) */}
      <div className="hidden print:grid grid-cols-4 gap-2 mb-4">
        <div className="p-3 bg-white border border-[#e0e3e5] rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.colors.onSurfaceVariant }}>
              Total Invoices
            </p>
            <h3 className="text-xl font-bold mt-0.5" style={{ color: theme.colors.onSurface }}>
              {summary.totalSalesCount}
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-white border border-[#e0e3e5] rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.colors.onSurfaceVariant }}>
              Total Revenue
            </p>
            <h3 className="text-xl font-bold mt-0.5" style={{ color: theme.colors.onSurface }}>
              Rs. {summary.totalRevenue.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-white border border-[#e0e3e5] rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.colors.onSurfaceVariant }}>
              Paid Received
            </p>
            <h3 className="text-xl font-bold mt-0.5 text-emerald-600">
              Rs. {summary.totalReceived.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-white border border-[#e0e3e5] rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.colors.onSurfaceVariant }}>
              Outstanding Receivables
            </p>
            <h3 className="text-xl font-bold mt-0.5 text-amber-600">
              Rs. {summary.totalOutstanding.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <FilterBar className="print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {/* Search Query Input */}
          <Input
            type="text"
            placeholder="Search invoice or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />

          {/* Payment Status Dropdown Filter */}
          <Select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            sizeVariant="sm"
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial Payment</option>
            <option value="unpaid">Unpaid / Credit</option>
          </Select>

          {/* Start Date */}
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />

          {/* End Date & Reset */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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

      {/* Sales Table Container */}
      <TableContainer className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
        {/* SCREEN TABLE (Paginated - 7 Items per Page) */}
        <div className="flex-1 overflow-y-auto min-h-0 print:hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center" style={{ color: theme.colors.textMuted }}>
                    No sale records found. Click &quot;Record Sale&quot; to create a new invoice.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSales.map((sale) => {
                  const balanceDue = sale.total_amount - sale.paid_amount;
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-bold text-blue-600">
                        {sale.invoice_number}
                      </TableCell>
                      <TableCell className="font-semibold whitespace-nowrap" style={{ color: theme.colors.onSurfaceVariant }}>
                        {sale.sale_date}
                      </TableCell>
                      <TableCell className="font-semibold" style={{ color: theme.colors.onSurface }}>
                        {sale.customer_name}
                      </TableCell>
                      <TableCell style={{ color: theme.colors.textMuted }}>
                        {sale.customer_phone || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" size="sm">
                          {sale.item_count || 1} items
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold" style={{ color: theme.colors.onSurface }}>
                        Rs. {sale.total_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-bold">
                        Rs. {sale.paid_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(sale.payment_status, balanceDue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link href={`/sales/${sale.id}`}>
                          <Button
                            variant="secondary"
                            size="xs"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                          >
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* PRINT TABLE (Un-paginated - Prints ALL Filtered Sales Records) */}
        <div className="hidden print:block">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={`print-${sale.id}`}>
                  <TableCell className="font-bold">{sale.invoice_number}</TableCell>
                  <TableCell>{sale.sale_date}</TableCell>
                  <TableCell className="font-semibold">{sale.customer_name}</TableCell>
                  <TableCell>{sale.customer_phone || "—"}</TableCell>
                  <TableCell className="text-center">{sale.item_count || 1}</TableCell>
                  <TableCell className="text-right font-bold">
                    Rs. {sale.total_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">
                    Rs. {sale.paid_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center uppercase font-bold text-[10px]">
                    {sale.payment_status}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Screen Pagination Controls */}
        <div className="p-2 border-t flex items-center justify-between text-xs shrink-0 print:hidden" style={{ backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.surfaceContainerHighest, color: theme.colors.onSurfaceVariant }}>
          <div>
            Showing{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {filteredSales.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredSales.length)}
            </span>{" "}
            of <span className="font-bold" style={{ color: theme.colors.onSurface }}>{filteredSales.length}</span> entries
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
    </div>
  );
}
