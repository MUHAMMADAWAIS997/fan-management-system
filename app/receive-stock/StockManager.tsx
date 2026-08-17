"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StockBatchSummary } from "@/lib/types/stock";
import { useI18n } from "@/lib/i18n-context";
import {
  ShoppingCart,
  Plus,
  Search,
  Building2,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import theme from "@/theme";
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
import { getStockBatchesAction } from "@/app/actions/stock";

interface StockManagerProps {
  initialBatches: StockBatchSummary[];
}

function StockManagerContent({ initialBatches }: StockManagerProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierIdParam = searchParams.get("supplierId");

  const [batches, setBatches] = useState<StockBatchSummary[]>(initialBatches);
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState(getDefaultStartDate(60));
  const [toDate, setToDate] = useState(getDefaultEndDate());
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  // Refetch batches from SQLite via Server Action when date bounds change
  useEffect(() => {
    let isMounted = true;
    getStockBatchesAction(fromDate || undefined, toDate || undefined).then((data) => {
      if (isMounted) {
        setBatches(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fromDate, toDate]);

  // Pagination State (7 entries per page)
  const ITEMS_PER_PAGE = 7;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, supplierIdParam, fromDate, toDate, paymentStatusFilter]);

  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      // Filter by supplierId if provided in query
      if (supplierIdParam && String(b.company_id) !== supplierIdParam) {
        return false;
      }

      // Filter by Payment Status
      if (paymentStatusFilter !== "all" && b.payment_status !== paymentStatusFilter) {
        return false;
      }

      // Filter by From Date
      if (fromDate && b.purchase_date < fromDate) {
        return false;
      }

      // Filter by To Date
      if (toDate && b.purchase_date > toDate) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (b.invoice_number && b.invoice_number.toLowerCase().includes(q)) ||
        (b.company_name && b.company_name.toLowerCase().includes(q)) ||
        (b.purchase_date && b.purchase_date.toLowerCase().includes(q))
      );
    });
  }, [batches, searchQuery, supplierIdParam, fromDate, toDate, paymentStatusFilter]);

  // Supplier Name if filtered
  const filteredSupplierName = useMemo(() => {
    if (!supplierIdParam) return null;
    const match = batches.find((b) => String(b.company_id) === supplierIdParam);
    return match?.company_name || `Supplier #${supplierIdParam}`;
  }, [batches, supplierIdParam]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(searchQuery || fromDate || toDate || paymentStatusFilter !== "all" || supplierIdParam);
  }, [searchQuery, fromDate, toDate, paymentStatusFilter, supplierIdParam]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setFromDate(getDefaultStartDate(60));
    setToDate(getDefaultEndDate());
    setPaymentStatusFilter("all");
    if (supplierIdParam) {
      router.push("/receive-stock");
    }
  };

  // Total pages based on filtered batches
  const totalPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE) || 1;

  // Paginated Slice (7 batches per page)
  const paginatedBatches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBatches.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBatches, currentPage]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t("status.paid")}
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            {t("status.partial")}
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="danger" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t("status.unpaid")}
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
        title={t("headers.receive_stock")}
        subtitle={filteredSupplierName ? `Supplier: ${filteredSupplierName}` : "Manage and track incoming stock shipments"}
        icon={<ShoppingCart className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <div className="flex items-center gap-2">
            {supplierIdParam && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push("/suppliers")}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                {t("ledgers.back_to_suppliers")}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/receive-stock/add")}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {t("buttons.receive_new_stock")}
            </Button>
          </div>
        }
      />

      {/* Filter & Search Bar with Date Range & Payment Status */}
      <FilterBar className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="min-w-[200px] flex-1">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Invoice #, Supplier..."
              leftIcon={<Search className="w-3.5 h-3.5" />}
              sizeVariant="sm"
            />
          </div>

          {/* From Date */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: theme.colors.onSurfaceVariant }}>From:</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              sizeVariant="sm"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: theme.colors.onSurfaceVariant }}>To:</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              sizeVariant="sm"
            />
          </div>

          {/* Payment Status Dropdown */}
          <div className="min-w-[140px] shrink-0">
            <Select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              sizeVariant="sm"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </Select>
          </div>
        </div>

        {/* Active Supplier Tag & Reset Button */}
        <div className="flex items-center gap-2 shrink-0">
          {supplierIdParam && (
            <Badge variant="brand" size="md" className="flex items-center gap-1.5">
              <span>Supplier: <strong>{filteredSupplierName}</strong></span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => router.push("/receive-stock")}
                className="p-0.5 h-auto hover:bg-[#bfe9f7]"
                style={{ color: theme.colors.primary }}
                title="Clear supplier filter"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}

          {isAnyFilterActive && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw className="w-3 h-3" />}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </FilterBar>

      {/* Batch Table Container */}
      <TableContainer className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
        <div className="flex-1 overflow-y-auto min-h-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-20">{t("table.sr_no")}</TableHead>
                <TableHead>{t("common.date")} & {t("common.invoice")}</TableHead>
                <TableHead>{t("table.supplier_name")}</TableHead>
                <TableHead>{t("table.items_count")}</TableHead>
                <TableHead>{t("table.total_amount")}</TableHead>
                <TableHead>{t("common.payment_status")}</TableHead>
                <TableHead>{t("common.paid_amount")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center" style={{ color: theme.colors.textMuted }}>
                    <ShoppingCart className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p className="text-xs font-medium">No stock receipt batches found matching criteria.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBatches.map((batch, index) => (
                  <TableRow key={`batch-${batch.id}-${index}`}>
                    <TableCell className="font-mono font-bold" style={{ color: theme.colors.onSurface }}>
                      #{batch.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold flex items-center gap-1" style={{ color: theme.colors.onSurface }}>
                          <FileText className="w-3.5 h-3.5" style={{ color: theme.colors.textMuted }} />
                          {batch.invoice_number}
                        </span>
                        <span className="text-[10px] flex items-center gap-1" style={{ color: theme.colors.textMuted }}>
                          <Calendar className="w-3 h-3" />
                          {batch.purchase_date}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold" style={{ color: theme.colors.onSurface }}>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: theme.colors.primary }} />
                        <span>{batch.company_name || `Supplier #${batch.company_id}`}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" size="sm">
                        <Package className="w-3 h-3 mr-1" style={{ color: theme.colors.onSurfaceVariant }} />
                        {batch.item_count || 1} Products
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold" style={{ color: theme.colors.primary }}>
                      Rs. {batch.total_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(batch.payment_status)}
                    </TableCell>
                    <TableCell className="font-semibold" style={{ color: theme.colors.onSurface }}>
                      Rs. {batch.paid_amount.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => router.push(`/receive-stock/${batch.id}`)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Screen Pagination Controls */}
        <div className="p-2 border-t flex items-center justify-between text-xs shrink-0" style={{ backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.surfaceContainerHighest, color: theme.colors.onSurfaceVariant }}>
          <div>
            Showing{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {filteredBatches.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredBatches.length)}
            </span>{" "}
            of <span className="font-bold" style={{ color: theme.colors.onSurface }}>{filteredBatches.length}</span> shipments
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

export default function StockManager({ initialBatches }: StockManagerProps) {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-500">Loading stock batches...</div>}>
      <StockManagerContent initialBatches={initialBatches} />
    </Suspense>
  );
}
