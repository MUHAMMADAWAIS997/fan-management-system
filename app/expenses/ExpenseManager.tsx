"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { Expense, ExpenseCategory } from "@/lib/types/expense";
import { createExpenseAction } from "@/app/actions/expense";
import { useI18n } from "@/lib/i18n-context";
import Toast from "@/app/components/Toast";
import theme from "@/theme";
import {
  Button,
  Input,
  Select,
  Modal,
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
  validateRequiredText,
  validateNumeric,
  validateDropdown,
  validateDate,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import {
  Receipt,
  Plus,
  Printer,
  Download,
  Calendar,
  DollarSign,
  Search,
  AlertCircle,
  Tag,
  Fuel,
  Truck,
  Building,
  Zap,
  UserCheck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";
import { getExpensesAction } from "@/app/actions/expense";

interface ExpenseManagerProps {
  initialExpenses: Expense[];
}

const CATEGORY_OPTIONS: ExpenseCategory[] = [
  "Stock Purchase",
  "Fuel",
  "Transport",
  "Rent",
  "Utilities",
  "Salaries",
  "Other",
];

export default function ExpenseManager({ initialExpenses }: ExpenseManagerProps) {
  const { t } = useI18n();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(getDefaultStartDate(60));
  const [toDate, setToDate] = useState<string>(getDefaultEndDate());

  // Refetch expenses from SQLite via Server Action when date bounds change
  useEffect(() => {
    let isMounted = true;
    getExpensesAction(fromDate || undefined, toDate || undefined).then((data) => {
      if (isMounted) {
        setExpenses(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [fromDate, toDate]);

  // Pagination State (6 entries per page)
  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // Add Expense Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("Fuel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceId, setReferenceId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, fromDate, toDate]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCat = e.category.toLowerCase().includes(q);
        const matchesDesc = (e.description || "").toLowerCase().includes(q);
        const matchesRef = (e.reference_id || "").toLowerCase().includes(q);
        if (!matchesCat && !matchesDesc && !matchesRef) return false;
      }

      // Category Filter
      if (selectedCategory && e.category !== selectedCategory) {
        return false;
      }

      // Date Range
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date > toDate) return false;

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, fromDate, toDate]);

  // Total pages calculation
  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE) || 1;

  // Paginated expenses slice
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExpenses, currentPage]);

  const isAnyFilterActive = useMemo(() => {
    return Boolean(searchQuery || selectedCategory || fromDate || toDate);
  }, [searchQuery, selectedCategory, fromDate, toDate]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let total = 0;
    let stockPurchaseTotal = 0;
    let manualOpsTotal = 0;

    filteredExpenses.forEach((e) => {
      total += e.amount;
      if (e.category === "Stock Purchase") {
        stockPurchaseTotal += e.amount;
      } else {
        manualOpsTotal += e.amount;
      }
    });

    return {
      total: total.toFixed(2),
      stockPurchaseTotal: stockPurchaseTotal.toFixed(2),
      manualOpsTotal: manualOpsTotal.toFixed(2),
      count: filteredExpenses.length,
    };
  }, [filteredExpenses]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setFromDate(getDefaultStartDate(60));
    setToDate(getDefaultEndDate());
    setCurrentPage(1);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return;

    const headers = ["Date", "Category", "Description", "Reference ID", "Amount (Rs.)"];
    const csvRows = filteredExpenses.map((e) => [
      `"${e.date}"`,
      `"${e.category}"`,
      `"${e.description || ""}"`,
      `"${e.reference_id || ""}"`,
      e.amount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Expense_Report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const catErr = validateDropdown(category, "Expense category");
    if (catErr) {
      setModalError(catErr);
      focusFirstInvalidInput();
      return;
    }

    const descErr = validateRequiredText(description, "Expense description", 1);
    if (descErr) {
      setModalError(descErr);
      focusFirstInvalidInput();
      return;
    }

    const amtErr = validateNumeric(amount, "Expense amount", { min: 0.01 });
    if (amtErr) {
      setModalError(amtErr);
      focusFirstInvalidInput();
      return;
    }

    const dateErr = validateDate(date, "Expense date");
    if (dateErr) {
      setModalError(dateErr);
      focusFirstInvalidInput();
      return;
    }

    const numAmount = Number(amount);

    startTransition(async () => {
      const res = await createExpenseAction({
        category,
        description,
        amount: numAmount,
        date: date || new Date().toISOString().split("T")[0],
        reference_id: referenceId,
      });

      if (res.success && res.data) {
        setExpenses((prev) => [res.data!, ...prev]);
        setIsAddModalOpen(false);
        setDescription("");
        setAmount("");
        setReferenceId("");
        setToastMsg("Expense recorded successfully!");
      } else {
        setModalError(res.message || "Failed to record expense.");
      }
    });
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "Stock Purchase":
        return (
          <Badge variant="brand" size="sm">
            <CreditCard className="w-3 h-3 mr-1" />
            Stock Purchase
          </Badge>
        );
      case "Fuel":
        return (
          <Badge variant="warning" size="sm">
            <Fuel className="w-3 h-3 mr-1" />
            Fuel
          </Badge>
        );
      case "Transport":
        return (
          <Badge variant="secondary" size="sm">
            <Truck className="w-3 h-3 mr-1 text-purple-600" />
            Transport
          </Badge>
        );
      case "Rent":
        return (
          <Badge variant="danger" size="sm">
            <Building className="w-3 h-3 mr-1" />
            Rent
          </Badge>
        );
      case "Utilities":
        return (
          <Badge variant="secondary" size="sm">
            <Zap className="w-3 h-3 mr-1 text-sky-600" />
            Utilities
          </Badge>
        );
      case "Salaries":
        return (
          <Badge variant="success" size="sm">
            <UserCheck className="w-3 h-3 mr-1" />
            Salaries
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" size="sm">
            <Tag className="w-3 h-3 mr-1" style={{ color: theme.colors.textMuted }} />
            {cat}
          </Badge>
        );
    }
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full space-y-2.5">
      <Toast message={toastMsg} type="success" onClose={() => setToastMsg(null)} duration={4000} />

      {/* Header */}
      <PageHeader
        title={t("headers.expenses")}
        icon={<Receipt className="w-4 h-4" style={{ color: theme.colors.primary }} />}
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
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              {t("common.print")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {t("buttons.add_expense")}
            </Button>
          </div>
        }
      />

      {/* Analytics Summary Cards (Visible only when printed) */}
      <div className="hidden print:grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white p-3 rounded-lg flex items-center justify-between" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
          <div>
            <span className="text-[11px] font-medium block" style={{ color: theme.colors.onSurfaceVariant }}>
              Total Expenses ({metrics.count})
            </span>
            <span className="text-lg font-bold mt-0.5 block" style={{ color: theme.colors.onSurface }}>
              Rs. {metrics.total}
            </span>
          </div>
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: theme.colors.errorBg, color: theme.colors.errorText }}>
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg flex items-center justify-between" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
          <div>
            <span className="text-[11px] font-medium block" style={{ color: theme.colors.onSurfaceVariant }}>
              Stock Purchase Payments
            </span>
            <span className="text-lg font-bold mt-0.5 block" style={{ color: theme.colors.primary }}>
              Rs. {metrics.stockPurchaseTotal}
            </span>
          </div>
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${theme.colors.brandBg}66`, color: theme.colors.primary }}>
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-3 rounded-lg flex items-center justify-between" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
          <div>
            <span className="text-[11px] font-medium block" style={{ color: theme.colors.onSurfaceVariant }}>
              Operational Expenses
            </span>
            <span className="text-lg font-bold mt-0.5 block" style={{ color: theme.colors.warningText }}>
              Rs. {metrics.manualOpsTotal}
            </span>
          </div>
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: theme.colors.warningBg, color: theme.colors.warningText }}>
            <Receipt className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <FilterBar className="print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {/* Search Query */}
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search description, invoice..."
            leftIcon={<Search className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />

          {/* Category Filter */}
          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sizeVariant="sm"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

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

      {/* Expenses Table */}
      <TableContainer className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between print:border-none print:shadow-none">
        <div className="flex-1 overflow-y-auto min-h-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-28">{t("common.date")}</TableHead>
                <TableHead className="w-36">{t("common.category")}</TableHead>
                <TableHead>{t("common.description")}</TableHead>
                <TableHead className="w-32">{t("table.reference")}</TableHead>
                <TableHead className="text-right w-32">{t("common.amount")}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-8 text-center" style={{ color: theme.colors.textMuted }}>
                    <Receipt className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p>No expense records match your filters.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExpenses.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-mono font-medium" style={{ color: theme.colors.onSurfaceVariant }}>
                      {exp.date}
                    </TableCell>
                    <TableCell>{getCategoryBadge(exp.category)}</TableCell>
                    <TableCell style={{ color: theme.colors.onSurface }}>
                      {exp.description || <span className="italic" style={{ color: theme.colors.textMuted }}>—</span>}
                    </TableCell>
                    <TableCell className="font-mono" style={{ color: theme.colors.onSurfaceVariant }}>
                      {exp.reference_id || <span className="italic" style={{ color: theme.colors.textMuted }}>—</span>}
                    </TableCell>
                    <TableCell className="text-right font-bold" style={{ color: theme.colors.onSurface }}>
                      Rs. {exp.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Screen Pagination Controls */}
        <div className="p-2 border-t flex items-center justify-between text-xs shrink-0 print:hidden" style={{ backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.surfaceContainerHighest, color: theme.colors.onSurfaceVariant }}>
          <div>
            Showing{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {filteredExpenses.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredExpenses.length)}
            </span>{" "}
            of <span className="font-bold" style={{ color: theme.colors.onSurface }}>{filteredExpenses.length}</span> expenses
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

      {/* Add Manual Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t("buttons.add_expense")}
        maxWidth="sm"
      >
        {modalError && (
          <div className="mb-3 p-2 rounded-md text-xs flex items-center gap-1.5" style={{ backgroundColor: theme.colors.errorBg, borderColor: theme.colors.errorBg, color: theme.colors.errorText }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleAddExpenseSubmit} className="space-y-3" noValidate>
          {/* Category */}
          <Select
            label="Expense Category *"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            sizeVariant="sm"
          >
            {CATEGORY_OPTIONS.filter((c) => c !== "Stock Purchase").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          {/* Amount */}
          <Input
            type="text"
            label="Expense Amount (Rs.) *"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            sizeVariant="sm"
          />

          {/* Date */}
          <Input
            type="date"
            label="Expense Date *"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            sizeVariant="sm"
          />

          {/* Description */}
          <Input
            type="text"
            label="Description / Remarks"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Fuel for pickup van"
            sizeVariant="sm"
          />

          {/* Reference ID */}
          <Input
            type="text"
            label="Receipt / Ref # (Optional)"
            value={referenceId}
            onChange={(e) => setReferenceId(e.target.value)}
            placeholder="e.g. RCP-88301"
            sizeVariant="sm"
          />

          <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: theme.colors.cardBorder }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save Expense"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Print Footer */}
      {mounted && (
        <div suppressHydrationWarning className="mt-4 pt-2 border-t text-center text-xs hidden print:block" style={{ borderColor: theme.colors.cardBorder, color: theme.colors.textMuted }}>
          Business Expense Report â€¢ Generated on {new Date().toLocaleDateString()}
        </div>
      )}
      <Watermark variant="page" />
    </div>
  );
}
