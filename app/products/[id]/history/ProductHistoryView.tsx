"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Product } from "@/lib/types/product";
import { useI18n } from "@/lib/i18n-context";
import theme from "@/theme";
import {
  Button,
  PageHeader,
  Badge,
  Input,
  StatCard,
  FilterBar,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableContainer,
  Watermark,
} from "@/ui";
import {
  Package,
  ArrowLeft,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Calendar,
  RotateCcw,
} from "lucide-react";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";
import { getProductHistoryAction } from "@/app/actions/product";

export interface TransactionItem {
  id: string;
  batch_id?: number;
  sale_id?: number;
  type: "IN" | "OUT";
  date: string;
  invoice_number: string;
  party_name: string;
  quantity: number;
  unit_retail_price: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

interface ProductHistoryViewProps {
  historyData: {
    product: Product;
    transactions: TransactionItem[];
    summary: {
      totalReceived: number;
      totalSold: number;
      currentStock: number;
      totalSalesRevenue: number;
      totalPurchaseCost: number;
    };
  };
}

export default function ProductHistoryView({ historyData }: ProductHistoryViewProps) {
  const { t } = useI18n();
  const [dataState, setDataState] = useState(historyData);
  const { product, transactions, summary } = dataState;

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
  const [fromDate, setFromDate] = useState(getDefaultStartDate(60));
  const [toDate, setToDate] = useState(getDefaultEndDate());

  // Refetch product history from SQLite via Server Action when date bounds change
  useEffect(() => {
    let isMounted = true;
    getProductHistoryAction(product.id, fromDate || undefined, toDate || undefined).then((res) => {
      if (isMounted && res) {
        setDataState(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [product.id, fromDate, toDate]);

  // Pagination State (7 entries per page)
  const ITEMS_PER_PAGE = 7;
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort transactions (most recent on top!)
  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((tx) => {
      const matchesSearch =
        tx.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.date.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "ALL" || tx.type === typeFilter;
      const matchesFromDate = !fromDate || (tx.date && tx.date >= fromDate);
      const matchesToDate = !toDate || (tx.date && tx.date <= toDate);

      return matchesSearch && matchesType && matchesFromDate && matchesToDate;
    });

    return list.sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateB !== dateA) {
        return dateB.localeCompare(dateA);
      }

      const parseTime = (str?: string): number => {
        if (!str) return 0;
        const timePart = str.includes(" ") ? str.split(" ")[1] : str;
        const parts = timePart.split(":");
        if (parts.length < 2) return 0;
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      };

      return parseTime(b.created_at) - parseTime(a.created_at);
    });
  }, [transactions, searchTerm, typeFilter, fromDate, toDate]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(searchTerm || typeFilter !== "ALL" || fromDate || toDate);
  }, [searchTerm, typeFilter, fromDate, toDate]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setTypeFilter("ALL");
    setFromDate(getDefaultStartDate(60));
    setToDate(getDefaultEndDate());
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full space-y-2.5">
      {/* Top Header */}
      <PageHeader
        title={product.name}
        subtitle={`${product.type} • Size: ${product.size}${product.supplier_name ? ` • Supplier: ${product.supplier_name}` : ""}`}
        icon={<Package className="w-4 h-4 text-[#19444f]" />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="md">
              Cost: Rs. {product.cost.toLocaleString()}
            </Badge>
            <Link href="/products">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                {t("common.back")}
              </Button>
            </Link>
          </div>
        }
      />

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        <StatCard
          title="Current Stock"
          value={`${summary.currentStock} Units`}
          icon={<Boxes className="w-4 h-4 text-[#19444f]" />}
        />

        <StatCard
          title="Total Received"
          value={`+${summary.totalReceived} Units`}
          icon={<ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
          trendType="positive"
        />

        <StatCard
          title="Total Sold"
          value={`-${summary.totalSold} Units`}
          icon={<ArrowUpRight className="w-4 h-4 text-[#19444f]" />}
        />

        <StatCard
          title="Sales Revenue"
          value={`Rs. ${summary.totalSalesRevenue.toLocaleString("en-PK")}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <FilterBar className="flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 w-full">
          <div className="min-w-[200px] flex-1">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search invoice number, party..."
              leftIcon={<Search className="w-3.5 h-3.5" />}
              sizeVariant="sm"
            />
          </div>

          <div className="w-36">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
              sizeVariant="sm"
            />
          </div>

          <div className="w-36">
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
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

        <div className="flex items-center gap-1 bg-[#f2f4f6] p-1 rounded-md border border-[#e0e3e5] text-xs font-semibold shrink-0">
          <Button
            variant={typeFilter === "ALL" ? "primary" : "ghost"}
            size="xs"
            onClick={() => {
              setTypeFilter("ALL");
              setCurrentPage(1);
            }}
          >
            All ({transactions.length})
          </Button>
          <Button
            variant={typeFilter === "IN" ? "primary" : "ghost"}
            size="xs"
            onClick={() => {
              setTypeFilter("IN");
              setCurrentPage(1);
            }}
          >
            Stock IN
          </Button>
          <Button
            variant={typeFilter === "OUT" ? "primary" : "ghost"}
            size="xs"
            onClick={() => {
              setTypeFilter("OUT");
              setCurrentPage(1);
            }}
          >
            Sales OUT
          </Button>
        </div>
      </FilterBar>

      {/* Transaction History Table */}
      <TableContainer className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
        <div className="flex-1 overflow-y-auto min-h-0">
          {paginatedTransactions.length === 0 ? (
            <div className="p-8 text-center text-[#71787b]">
              <Package className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-xs font-medium">
                {searchTerm || typeFilter !== "ALL"
                  ? "No matching product transactions found."
                  : "No transaction history recorded yet for this product."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-10 text-center">{t("table.sr_no")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead className="text-center">{t("common.type")}</TableHead>
                  <TableHead>{t("table.reference")}</TableHead>
                  <TableHead>{t("common.supplier")}</TableHead>
                  <TableHead className="text-center">{t("common.quantity")}</TableHead>
                  <TableHead className="text-right">{t("common.retail_price")}</TableHead>
                  <TableHead className="text-right">{t("common.price")}</TableHead>
                  <TableHead className="text-right">{t("table.total_amount")}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((tx, idx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  const isIN = tx.type === "IN";

                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-center font-mono text-[#71787b] font-medium">
                        {globalIdx}
                      </TableCell>
                      <TableCell className="font-mono text-[#41484a] font-medium">
                        {tx.date}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isIN ? "success" : "brand"} size="sm">
                          {isIN ? (
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          )}
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-[#191c1e]">
                        {isIN && tx.batch_id ? (
                          <Link
                            href={`/receive-stock/${tx.batch_id}`}
                            className="text-[#19444f] hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-[#71787b]" />
                            <span>{tx.invoice_number}</span>
                          </Link>
                        ) : !isIN && tx.sale_id ? (
                          <Link
                            href={`/sales/${tx.sale_id}`}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-[#71787b]" />
                            <span>{tx.invoice_number}</span>
                          </Link>
                        ) : (
                          <span>{tx.invoice_number}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#191c1e] font-medium">
                        <div className="flex items-center gap-1">
                          {isIN ? (
                            <Building2 className="w-3.5 h-3.5 text-[#19444f] shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-[#19444f] shrink-0" />
                          )}
                          <span>{tx.party_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isIN ? "success" : "brand"} size="sm">
                          {isIN ? `+${tx.quantity}` : `-${tx.quantity}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-[#41484a] font-medium">
                        Rs. {tx.unit_retail_price.toLocaleString("en-PK")}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#41484a]">
                        Rs. {tx.unit_price.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-[#191c1e]">
                        Rs. {tx.total_price.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Screen Pagination Controls */}
        <div className="p-2 bg-[#f2f4f6] border-t border-[#e0e3e5] flex items-center justify-between text-xs text-[#41484a] shrink-0">
          <div>
            Showing{" "}
            <span className="font-bold text-[#191c1e]">
              {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-[#191c1e]">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)}
            </span>{" "}
            of <span className="font-bold text-[#191c1e]">{filteredTransactions.length}</span> transactions
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

            <span className="px-2 font-bold text-[#191c1e]">
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
