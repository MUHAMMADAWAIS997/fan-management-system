"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import Link from "next/link";
import { SummaryReportResult, SummaryType } from "@/lib/services/summary.service";
import { getSummaryDataAction } from "@/app/actions/summary";
import { useI18n } from "@/lib/i18n-context";
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
  Watermark,
  StatCard,
} from "@/ui";
import {
  ArrowLeft,
  Search,
  Calendar,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface SummaryViewProps {
  initialReport: SummaryReportResult;
  type: SummaryType;
}

export default function SummaryView({ initialReport, type }: SummaryViewProps) {
  const { t } = useI18n();
  const [report, setReport] = useState<SummaryReportResult>(initialReport);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();

  // Helper to translate table column headers if dictionary key exists
  const getColHeaderLabel = (col: { key: string; label: string }) => {
    const tableKey = `table.${col.key}`;
    const commonKey = `common.${col.key}`;
    const keyMap: Record<string, string> = {
      invoice_number: "table.invoice_no",
      date: "common.date",
      customer_name: "table.customer_name",
      supplier_name: "table.supplier_name",
      total_amount: "table.total_amount",
      payment_status: "common.payment_status",
      reference_id: "table.reference",
      amount: "common.amount",
      description: "common.description",
      category: "common.category",
    };

    if (keyMap[col.key] && t(keyMap[col.key]) !== keyMap[col.key]) {
      return t(keyMap[col.key]);
    }
    if (t(tableKey) !== tableKey) return t(tableKey);
    if (t(commonKey) !== commonKey) return t(commonKey);
    return col.label;
  };

  // Pagination State (7 entries per page)
  const ITEMS_PER_PAGE = 7;
  const [currentPage, setCurrentPage] = useState(1);

  // Refetch summary data when search or date bounds change
  useEffect(() => {
    let isMounted = true;
    startTransition(async () => {
      const updated = await getSummaryDataAction(
        type,
        startDate || undefined,
        endDate || undefined,
        searchQuery || undefined
      );
      if (isMounted) {
        setReport(updated);
        setCurrentPage(1);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [type, startDate, endDate, searchQuery]);

  const totalPages = Math.ceil(report.rows.length / ITEMS_PER_PAGE) || 1;

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return report.rows.slice(start, start + ITEMS_PER_PAGE);
  }, [report.rows, currentPage]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
  };

  const handleExportCSV = () => {
    if (report.rows.length === 0) return;

    const headers = report.columns.map((c) => c.label);
    const csvRows = report.rows.map((row) =>
      report.columns
        .map((c) => {
          const val = row[c.key] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${type}_summary_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCellContent = (row: Record<string, any>, colKey: string) => {
    const val = row[colKey];

    if (colKey === "payment_status") {
      switch (val) {
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
              Partial
            </Badge>
          );
        case "unpaid":
          return (
            <Badge variant="danger" size="sm">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unpaid
            </Badge>
          );
        default:
          return <Badge variant="secondary" size="sm">{val}</Badge>;
      }
    }

    if (typeof val === "number" && (colKey.includes("amount") || colKey.includes("revenue") || colKey.includes("cost") || colKey.includes("profit") || colKey.includes("balance"))) {
      return `Rs. ${val.toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;
    }

    return val ?? "—";
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full space-y-2.5">
      {/* Top Header */}
      <PageHeader
        title={report.title}
        subtitle={report.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/home">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                {t("common.back")}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4 text-emerald-700" />}
              onClick={handleExportCSV}
            >
              {t("common.export")} CSV
            </Button>
          </div>
        }
      />

      {/* Summary Metrics Bar if present */}
      {report.summaryMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          {Object.entries(report.summaryMetrics).map(([label, value]) => (
            <div key={label} className="bg-white border border-[#e0e3e5] rounded-xl p-3 shadow-xs">
              <div className="text-xs font-semibold text-[#41484a] uppercase tracking-wider">{label}</div>
              <div className="text-xl font-extrabold text-[#191c1e] mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#41484a]" />}
          />
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36 text-xs"
          />
          <span className="text-xs text-[#41484a]">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36 text-xs"
          />
          {(searchQuery || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
          )}
        </div>
      </FilterBar>

      {/* Report Table */}
      <div className="flex-1 min-h-0 flex flex-col bg-white border border-[#e0e3e5] rounded-xl shadow-xs overflow-hidden relative">
        {report.rows.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2 my-auto">
            <FileText className="w-10 h-10 text-[#41484a]/50" />
            <h4 className="text-sm font-bold text-[#191c1e]">No Records Found</h4>
            <p className="text-xs text-[#71787b] max-w-sm">
              No matching historical records found for the selected query or date bounds.
            </p>
          </div>
        ) : (
          <TableContainer className="flex-1 min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {report.columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      }
                    >
                      {getColHeaderLabel(col)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row, idx) => (
                  <TableRow key={row.id || idx}>
                    {report.columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={
                          col.align === "right"
                            ? "text-right font-medium"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        }
                      >
                        {renderCellContent(row, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Footer Pagination */}
        <div className="p-2.5 border-t border-[#e0e3e5] bg-[#f8f9fa] flex items-center justify-between shrink-0 text-xs">
          <span className="text-[#41484a] font-medium">
            Showing {report.rows.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, report.rows.length)} of {report.rows.length} records
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <span className="px-2 font-semibold text-[#191c1e]">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="secondary"
              size="xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
