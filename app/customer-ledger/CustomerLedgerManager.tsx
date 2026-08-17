"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import { Customer } from "@/lib/types/customer";
import { CustomerLedgerEntry } from "@/lib/types/customer_ledger";
import { useI18n } from "@/lib/i18n-context";
import {
  getCustomerLedgerAction,
  recordCustomerPaymentAction,
} from "@/app/actions/customer_ledger";
import theme from "@/theme";
import SearchableSelect, { SelectOption } from "@/app/components/SearchableSelect";
import {
  validateNumeric,
  validateDate,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import {
  Button,
  Input,
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
  StatCard,
  Badge,
  Watermark,
} from "@/ui";
import {
  BookOpen,
  User,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Loader2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface CustomerLedgerManagerProps {
  customers: Customer[];
  initialCustomerId?: number;
  initialLedger?: CustomerLedgerEntry[];
}

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export default function CustomerLedgerManager({
  customers,
  initialCustomerId,
  initialLedger = [],
}: CustomerLedgerManagerProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(
    initialCustomerId || (customers.length > 0 ? customers[0].id : 0)
  );

  const [fromDate, setFromDate] = useState(getDefaultStartDate(60));
  const [toDate, setToDate] = useState(getDefaultEndDate());

  const [ledgerEntries, setLedgerEntries] =
    useState<CustomerLedgerEntry[]>(initialLedger);
  const [isFetching, startFetchTransition] = useTransition();

  // Refetch customer ledger from SQLite via Server Action when customer or date bounds change
  useEffect(() => {
    if (!selectedCustomerId) return;
    startFetchTransition(async () => {
      const data = await getCustomerLedgerAction(selectedCustomerId, fromDate || undefined, toDate || undefined);
      setLedgerEntries(data);
    });
  }, [selectedCustomerId, fromDate, toDate]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();
  const [modalError, setModalError] = useState<string | null>(null);

  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentDescription, setPaymentDescription] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const customerSelectOptions: SelectOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: String(c.id),
      label: `${c.name} (${c.phone})`,
      sublabel: c.location || "No Location",
    }));
  }, [customers]);

  // Pagination State (5 entries per page)
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(ledgerEntries.length / ITEMS_PER_PAGE) || 1;

  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return ledgerEntries.slice(start, start + ITEMS_PER_PAGE);
  }, [ledgerEntries, currentPage]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalCredit = 0;
    let totalDebit = 0;

    ledgerEntries.forEach((entry) => {
      totalCredit += entry.credit;
      totalDebit += entry.debit;
    });

    const currentBalance = totalCredit - totalDebit;

    return {
      totalCredit,
      totalDebit,
      totalCharged: totalCredit,
      totalPaid: totalDebit,
      currentBalance,
      entryCount: ledgerEntries.length,
    };
  }, [ledgerEntries]);

  // Handle Recording Payment (Debt Return)
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
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

    const amount = parseFloat(paymentAmount);

    startSubmitTransition(async () => {
      const result = await recordCustomerPaymentAction({
        customer_id: selectedCustomerId,
        date: paymentDate,
        amount,
        description: paymentDescription || undefined,
        reference_id: paymentReference || undefined,
      });

      if (result.success) {
        setIsModalOpen(false);
        setPaymentAmount("");
        setPaymentDescription("");
        setPaymentReference("");

        // Refresh ledger
        const updated = await getCustomerLedgerAction(selectedCustomerId);
        setLedgerEntries(updated);
      } else {
        setModalError(result.error || "Failed to record customer payment.");
      }
    });
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      alert("Unable to open print preview. Please check browser printer permissions.");
    }
  };

  const handleExportCSV = () => {
    try {
      if (ledgerEntries.length === 0) return;

      const headers = [
        "ID",
        "Date",
        "Invoice #",
        "Description",
        "Credit (Charged PKR)",
        "Debit (Paid PKR)",
        "Balance Owed (PKR)",
      ];

      const rows = ledgerEntries.map((e) => [
        e.id,
        `"${(e.date || "").replace(/"/g, '""')}"`,
        `"${(e.invoice_number || "—").replace(/"/g, '""')}"`,
        `"${(e.description || "").replace(/"/g, '""')}"`,
        e.credit.toFixed(2),
        e.debit.toFixed(2),
        e.balance.toFixed(2),
      ]);

      const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Customer_Ledger_${selectedCustomer?.name || "Customer"}_${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export customer ledger CSV file. Please try again.");
    }
  };

  // Fetch customer ledger when selection changes
  const handleCustomerSelect = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setCurrentPage(1);
    startFetchTransition(async () => {
      const data = await getCustomerLedgerAction(customerId);
      setLedgerEntries(data);
    });
  };

  const { t } = useI18n();

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full space-y-2.5">
      {/* Top Header & Actions */}
      <PageHeader
        title={t("ledgers.customer_ledger")}
        subtitle={selectedCustomer ? `${t("common.name")}: ${selectedCustomer.name} (${selectedCustomer.phone})` : undefined}
        icon={<BookOpen className="w-4 h-4 text-[#19444f]" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/customers">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                {t("ledgers.back_to_customers")}
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
              onClick={() => setIsModalOpen(true)}
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
            >
              {t("ledgers.receive_payment")}
            </Button>
          </div>
        }
      />

      {/* Customer Selector Bar */}
      <FilterBar className="flex items-center justify-between gap-3 print:border-none print:shadow-none">
        <div className="flex-1 flex items-center gap-2 max-w-md">
          <User className="w-4 h-4 text-[#19444f] shrink-0" />
          <div className="w-full">
            <SearchableSelect
              options={customerSelectOptions}
              value={String(selectedCustomerId)}
              onChange={(val) => handleCustomerSelect(parseInt(val || "0"))}
              placeholder="Search customer by name or phone..."
            />
          </div>
        </div>

        {selectedCustomer && (
          <div className="flex items-center gap-4 text-xs text-[#41484a] bg-[#f2f4f6] px-3 py-1.5 rounded-md border border-[#e0e3e5]">
            <div>
              <span className="text-[#71787b] mr-1">{t("common.phone")}:</span>
              <span className="font-semibold text-[#191c1e]">{selectedCustomer.phone || "—"}</span>
            </div>
            {selectedCustomer.location && (
              <div>
                <span className="text-[#71787b] mr-1">{t("common.location")}:</span>
                <span className="font-semibold text-[#191c1e]">{selectedCustomer.location}</span>
              </div>
            )}
            <div>
              <span className="text-[#71787b] mr-1">{t("table.balance_owed")}:</span>
              <span className={`font-bold ${summary.currentBalance > 0 ? "text-[#ba1a1a]" : "text-emerald-700"}`}>
                Rs. {summary.currentBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </FilterBar>

      {/* 3 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
        <StatCard
          title={t("ledgers.total_invoiced")}
          value={`Rs. ${summary.totalCharged.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`}
          icon={<ArrowUpRight className="w-4 h-4 text-[#19444f]" />}
        />

        <StatCard
          title={t("ledgers.payments_received")}
          value={`Rs. ${summary.totalPaid.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`}
          icon={<ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
          trendType="positive"
        />

        <StatCard
          title={t("ledgers.balance_due")}
          value={`Rs. ${summary.currentBalance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`}
          icon={<DollarSign className={`w-4 h-4 ${summary.currentBalance > 0 ? "text-[#ba1a1a]" : "text-emerald-600"}`} />}
          trendType={summary.currentBalance > 0 ? "negative" : "positive"}
        />
      </div>

      {/* Ledger Table Container */}
      <TableContainer className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between print:border-none print:shadow-none">
        <div className="p-2.5 border-b border-[#e0e3e5] flex items-center justify-between shrink-0">
          <h2 className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-[#19444f]" />
            {t("app.history")} ({selectedCustomer?.name || "Customer"})
          </h2>
          {isFetching && (
            <span className="text-xs text-[#19444f] flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating ledger...
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-28">{t("common.date")}</TableHead>
                <TableHead className="w-28">{t("common.invoice")}</TableHead>
                <TableHead>{t("common.description")}</TableHead>
                <TableHead className="text-right w-36">{t("common.credit")}</TableHead>
                <TableHead className="text-right w-36">{t("common.debit")}</TableHead>
                <TableHead className="text-right w-36">{t("common.balance")}</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {paginatedEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[#71787b]">
                    No financial ledger transactions found for this customer.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-[#41484a] font-mono text-xs">{entry.date}</TableCell>
                    <TableCell className="font-bold text-blue-600">
                      {entry.invoice_number || "—"}
                    </TableCell>
                    <TableCell className="text-[#191c1e]">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#ba1a1a]">
                      {entry.credit > 0
                        ? `+ Rs. ${entry.credit.toLocaleString("en-PK", {
                            minimumFractionDigits: 2,
                          })}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      {entry.debit > 0
                        ? `- Rs. ${entry.debit.toLocaleString("en-PK", {
                            minimumFractionDigits: 2,
                          })}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-[#191c1e]">
                      Rs. {entry.balance.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Screen Pagination Controls */}
        <div className="p-2 bg-[#f2f4f6] border-t border-[#e0e3e5] flex items-center justify-between text-xs text-[#41484a] shrink-0 print:hidden">
          <div>
            Showing{" "}
            <span className="font-bold text-[#191c1e]">
              {ledgerEntries.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-[#191c1e]">
              {Math.min(currentPage * ITEMS_PER_PAGE, ledgerEntries.length)}
            </span>{" "}
            of <span className="font-bold text-[#191c1e]">{ledgerEntries.length}</span> entries
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

      {/* Record Debt Return Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Debt Return"
        maxWidth="sm"
      >
        <p className="text-[11px] text-[#71787b] mb-3">
          Customer: <strong className="text-[#191c1e]">{selectedCustomer?.name}</strong> (Owed: Rs. {summary.currentBalance.toFixed(2)})
        </p>

        {modalError && (
          <div className="mb-3 p-2 rounded-md bg-[#ffdad6] border border-[#ffb4ab] text-[#ba1a1a] text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleRecordPaymentSubmit} className="space-y-3" noValidate>
          <Input
            type="date"
            label="Payment Date *"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
            sizeVariant="sm"
          />

          <Input
            type="text"
            inputMode="decimal"
            label="Amount Received (Rs.) *"
            value={paymentAmount}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, "");
              const parts = raw.split(".");
              const clean = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
              setPaymentAmount(clean);
            }}
            required
            sizeVariant="sm"
            placeholder="e.g. 5000"
          />

          <Input
            type="text"
            label="Reference / Receipt # (Optional)"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            sizeVariant="sm"
            placeholder="e.g. Cash / Bank Txn"
          />

          <Input
            type="text"
            label="Description / Note"
            value={paymentDescription}
            onChange={(e) => setPaymentDescription(e.target.value)}
            sizeVariant="sm"
            placeholder="e.g. Debt return payment"
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0e3e5]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              leftIcon={
                isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )
              }
            >
              {isSubmitting ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </Modal>
      <Watermark variant="page" />
    </div>
  );
}
