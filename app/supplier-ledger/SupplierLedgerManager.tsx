"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";
import { Supplier } from "@/lib/types/supplier";
import { SupplierLedgerEntry } from "@/lib/types/supplier_ledger";
import { useI18n } from "@/lib/i18n-context";
import theme from "@/theme";
import {
  recordSupplierPaymentAction,
  getSupplierLedgerAction,
} from "@/app/actions/supplier_ledger";
import SearchableSelect, { SelectOption } from "@/app/components/SearchableSelect";
import {
  validateNumeric,
  validateDate,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import { Button, Input, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableContainer, PageHeader, StatCard, Badge, Watermark } from "@/ui";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  Plus,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  CreditCard,
  History,
  ShieldCheck,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SupplierLedgerManagerProps {
  suppliers: Supplier[];
  initialLedgers: Record<number, SupplierLedgerEntry[]>;
  initialSupplierId?: number;
}

export default function SupplierLedgerManager({
  suppliers,
  initialLedgers,
  initialSupplierId,
}: SupplierLedgerManagerProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(
    initialSupplierId || (suppliers.length > 0 ? suppliers[0].id : 0)
  );

  const [fromDate, setFromDate] = useState(getDefaultStartDate(60));
  const [toDate, setToDate] = useState(getDefaultEndDate());

  const [ledgerMap, setLedgerMap] =
    useState<Record<number, SupplierLedgerEntry[]>>(initialLedgers);

  const [isPending, startTransition] = useTransition();

  // Refetch supplier ledger entries when selected supplier or date bounds change
  useEffect(() => {
    if (!selectedSupplierId) return;
    startTransition(async () => {
      const data = await getSupplierLedgerAction(selectedSupplierId, fromDate || undefined, toDate || undefined);
      setLedgerMap((prev) => ({ ...prev, [selectedSupplierId]: data }));
    });
  }, [selectedSupplierId, fromDate, toDate]);
  
  const [mounted, setMounted] = useState(false);

  // Pagination State (5 entries per page)
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when selected supplier changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSupplierId]);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentDesc, setPaymentDesc] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setPaymentDate(new Date().toISOString().split("T")[0]);
  }, []);

  // Active supplier ledger history
  const activeEntries = useMemo(() => {
    return ledgerMap[selectedSupplierId] || [];
  }, [ledgerMap, selectedSupplierId]);

  // Total pages based on active entries
  const totalPages = Math.ceil(activeEntries.length / ITEMS_PER_PAGE) || 1;

  // Paginated Slice (7 entries per page)
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return activeEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [activeEntries, currentPage]);

  // Selected supplier object
  const activeSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId);
  }, [suppliers, selectedSupplierId]);

  const supplierSelectOptions: SelectOption[] = useMemo(() => {
    return suppliers.map((s) => ({
      value: String(s.id),
      label: s.name,
      sublabel: s.phone ? `Phone: ${s.phone}` : undefined,
    }));
  }, [suppliers]);

  // Financial Calculations
  const metrics = useMemo(() => {
    let totalPurchases = 0; // Credits
    let totalPayments = 0; // Debits

    activeEntries.forEach((e) => {
      totalPurchases += e.credit;
      totalPayments += e.debit;
    });

    const currentBalance =
      activeEntries.length > 0
        ? activeEntries[0].balance
        : 0;

    return {
      totalPurchases: totalPurchases.toFixed(2),
      totalPayments: totalPayments.toFixed(2),
      currentBalance: currentBalance.toFixed(2),
      rawBalance: currentBalance,
    };
  }, [activeEntries]);

  const handleSupplierChange = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    if (!ledgerMap[supplierId]) {
      startTransition(async () => {
        const entries = await getSupplierLedgerAction(supplierId);
        setLedgerMap((prev) => ({ ...prev, [supplierId]: entries }));
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (activeEntries.length === 0) return;

    const headers = [
      "Date",
      "Invoice / Voucher #",
      "Transaction Description",
      "Stock Credit (Debt Added Rs.)",
      "Debt Return (Debit Rs.)",
      "Running Debt Balance (Rs.)",
    ];

    const csvRows = activeEntries.map((e) => [
      `"${e.date}"`,
      `"${e.invoice_number || ""}"`,
      `"${e.description || ""}"`,
      e.credit,
      e.debit,
      e.balance,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Supplier_Debt_Ledger_${activeSupplier?.name || "Supplier"}_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDebtPaymentModal = (presetFullDebt: boolean = false) => {
    setModalError(null);
    if (presetFullDebt && metrics.rawBalance > 0) {
      setPaymentAmount(metrics.currentBalance);
    } else {
      setPaymentAmount("");
    }
    setPaymentDesc(`Debt return payment to ${activeSupplier?.name || "Supplier"}`);
    setPaymentRef(`VOUCHER-${Date.now().toString().slice(-5)}`);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const dateErr = validateDate(paymentDate, "Payment date");
    if (dateErr) {
      setModalError(dateErr);
      focusFirstInvalidInput();
      return;
    }

    const amtErr = validateNumeric(paymentAmount, "Payment amount", { min: 0.01 });
    if (amtErr) {
      setModalError(amtErr);
      focusFirstInvalidInput();
      return;
    }

    const amt = Number(paymentAmount);

    startTransition(async () => {
      const res = await recordSupplierPaymentAction({
        supplier_id: selectedSupplierId,
        amount: amt,
        date: paymentDate || new Date().toISOString().split("T")[0],
        description:
          paymentDesc || `Debt return payment to ${activeSupplier?.name || "Supplier"}`,
        invoice_number: paymentRef || "DEBT-PAYMENT",
      });

      if (res.success && res.data) {
        setLedgerMap((prev) => ({
          ...prev,
          [selectedSupplierId]: [res.data!, ...(prev[selectedSupplierId] || [])],
        }));
        setIsPaymentModalOpen(false);
        setPaymentAmount("");
        setPaymentDesc("");
        setPaymentRef("");
      } else {
        setModalError(res.message || "Failed to record debt payment.");
      }
    });
  };

  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full space-y-2.5">
      {/* Top Header & Actions */}
      <PageHeader
        title={t("ledgers.supplier_ledger")}
        subtitle={activeSupplier ? `${t("table.supplier_name")}: ${activeSupplier.name} (${activeSupplier.phone})` : undefined}
        icon={<Building2 className="w-4 h-4 text-[#19444f]" />}
        actions={
          <>
            <Link href="/suppliers">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                {t("ledgers.back_to_suppliers")}
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              {t("common.print")}
            </Button>
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
              onClick={() => setIsPaymentModalOpen(true)}
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
            >
              {t("ledgers.make_payment")}
            </Button>
          </>
        }
      />

      {/* Supplier Dropdown Selector */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs mb-2 flex items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex items-center gap-2 max-w-md flex-1">
          <Building2 className="w-4 h-4 text-green-900 shrink-0" />
          <div className="w-full">
            <SearchableSelect
              options={supplierSelectOptions}
              value={String(selectedSupplierId)}
              onChange={(val) => handleSupplierChange(Number(val || "0"))}
              placeholder="Search supplier..."
            />
          </div>
        </div>

        {/* Pending Debt Status Banner */}
        <div className="flex items-center gap-2 shrink-0">
          {metrics.rawBalance === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-md flex items-center gap-1.5 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero Debt (Settled)</span>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1 rounded-md flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Pending: <strong className="text-amber-800">Rs. {metrics.currentBalance}</strong></span>
              </div>
              <button
                onClick={() => openDebtPaymentModal(true)}
                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded transition-colors text-[11px] cursor-pointer"
              >
                Pay Full Debt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3 Summary Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2 shrink-0">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("ledgers.total_purchased")}
            </p>
            <h3 className="text-sm font-black text-slate-900 mt-0.5">
              Rs. {metrics.totalPurchases}
            </h3>
          </div>
          <div className="p-2 rounded-md bg-rose-50 text-rose-600 shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("ledgers.payments_made")}
            </p>
            <h3 className="text-sm font-black text-emerald-700 mt-0.5">
              Rs. {metrics.totalPayments}
            </h3>
          </div>
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t("ledgers.balance_due")}
            </p>
            <h3 className={`text-sm font-black mt-0.5 ${metrics.rawBalance > 0 ? "text-amber-600" : "text-emerald-700"}`}>
              Rs. {metrics.currentBalance}
            </h3>
          </div>
          <div className={`p-2 rounded-md ${metrics.rawBalance > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Transaction Statement Table Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs flex-1 flex flex-col overflow-hidden min-h-0 print:border-none print:shadow-none">
        <div className="p-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t("app.history")}: {activeSupplier?.name || "Supplier"}
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 font-mono">
            {activeEntries.length} Transactions
          </span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-28">{t("common.date")}</th>
                <th className="py-2.5 px-3 w-32">{t("table.reference")}</th>
                <th className="py-2.5 px-3">{t("common.description")}</th>
                <th className="py-2.5 px-3 text-right w-32">{t("common.credit")}</th>
                <th className="py-2.5 px-3 text-right w-32 text-emerald-700">
                  {t("common.debit")}
                </th>
                <th className="py-2.5 px-3 text-right w-36 font-bold text-slate-700">
                  {t("common.balance")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xs">
                    <BookOpen className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
                    <p>No transactions recorded for this supplier account.</p>
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 font-mono text-slate-600 font-medium">
                      {entry.date}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700 font-semibold">
                      {entry.invoice_number || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-800 font-medium">
                      {entry.description}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900">
                      {entry.credit > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          + Rs. {entry.credit.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                      {entry.debit > 0 ? (
                        <span>- Rs. {entry.debit.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 bg-slate-50/40">
                      Rs. {entry.balance.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Screen Pagination Controls */}
        <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0 print:hidden">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-900">
              {activeEntries.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * ITEMS_PER_PAGE, activeEntries.length)}
            </span>{" "}
            of <span className="font-bold text-slate-900">{activeEntries.length}</span> transactions
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border bg-white border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <span className="px-2 font-bold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded border bg-white border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Debt Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-green-900" />
                Record Debt Payment
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="bg-red-50 text-red-600 p-2 rounded-md text-xs mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-2.5" noValidate>
              {/* Supplier Info & Current Debt */}
              <div className="bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    {activeSupplier?.name}
                  </span>
                  <span className="text-[10px] text-amber-700">Phone: {activeSupplier?.phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-amber-700 block">
                    Pending Debt
                  </span>
                  <span className="text-xs font-extrabold text-amber-900">
                    Rs. {metrics.currentBalance}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Amount (Rs.) *
                  </label>
                  {metrics.rawBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(metrics.currentBalance)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Fill Full Debt
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold placeholder-slate-400 transition-all"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Date *
                </label>
                <input
                  type="text"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium placeholder-slate-400 transition-all"
                />
              </div>

              {/* Voucher / Ref # */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Voucher / Ref #
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. VOUCHER-991"
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium placeholder-slate-400 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Remarks / Note
                </label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  placeholder="e.g. Paid debt balance via cash"
                  className="w-full px-2.5 py-1.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium placeholder-slate-400 transition-all"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Footer */}
      {mounted && (
        <div suppressHydrationWarning className="mt-4 pt-2 border-t border-slate-200 text-center text-xs text-slate-400 hidden print:block">
          Supplier Ledger & Debt Statement • Generated on {new Date().toLocaleDateString()}
        </div>
      )}
      <Watermark variant="page" />
    </div>
  );
}
