"use client";

import { useRouter } from "next/navigation";
import { StockBatchSummary } from "@/lib/types/stock";
import theme from "@/theme";
import {
  ArrowLeft,
  Printer,
  Building2,
  Calendar,
  FileText,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import {
  Button,
  PageHeader,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableContainer,
  Watermark,
} from "@/ui";

interface BatchDetailViewProps {
  batch: StockBatchSummary;
}

export default function BatchDetailView({ batch }: BatchDetailViewProps) {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Full Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1" />
            Partial Payment
          </Badge>
        );
      case "unpaid":
        return (
          <Badge variant="danger" size="sm">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Unpaid / Credit
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

  const balanceDue = Math.max(0, batch.total_amount - batch.paid_amount);

  return (
    <div className="h-full flex flex-col p-2 sm:p-3 overflow-hidden max-w-4xl mx-auto w-full print:p-0 print:max-w-none print:h-auto print:overflow-visible space-y-2.5">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="print:hidden">
        <PageHeader
          title={`Batch Invoice #${batch.invoice_number}`}
          subtitle={`Supplier: ${batch.company_name || ""}`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push("/suppliers")}
                leftIcon={<Building2 className="w-3.5 h-3.5" />}
              >
                Back to Suppliers
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push("/receive-stock")}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Received Stock
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
              >
                Print Invoice
              </Button>
            </div>
          }
        />
      </div>

      {/* Printable Invoice Container */}
      <div
        id="printable-area"
        className="bg-white rounded-xl border border-[#e0e3e5] shadow-xs p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden print:border-none print:shadow-none print:p-2 print:overflow-visible print:h-auto"
      >
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between pb-2 border-b border-[#e0e3e5] gap-2 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Receipt className="w-5 h-5 text-[#19444f] shrink-0" />
              <h1 className="text-base font-extrabold text-[#191c1e] tracking-tight uppercase">
                Stock Receipt Invoice
              </h1>
            </div>
            <p className="text-[11px] text-[#71787b] font-mono">
              Batch #{batch.id} • Ref: {batch.invoice_number}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="mb-0.5">{getStatusBadge(batch.payment_status)}</div>
            <p className="text-[11px] text-[#71787b] flex items-center sm:justify-end gap-1 mt-0.5 font-medium">
              <Calendar className="w-3 h-3 text-[#71787b]" />
              <span>Date: <strong className="text-[#191c1e]">{batch.purchase_date}</strong></span>
            </p>
          </div>
        </div>

        {/* Supplier & Invoice Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2 p-2.5 bg-[#f2f4f6] rounded-lg border border-[#e0e3e5] shrink-0 print:bg-transparent print:border-[#e0e3e5]">
          <div>
            <span className="text-[10px] font-bold text-[#71787b] uppercase tracking-wider block mb-0.5">
              Supplier / Company
            </span>
            <h3 className="text-xs font-bold text-[#191c1e] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#19444f] shrink-0" />
              {batch.company_name || `Supplier #${batch.company_id}`}
            </h3>
            {batch.company_phone && (
              <p className="text-[11px] text-[#41484a] mt-0.5 font-medium">
                Phone: {batch.company_phone}
              </p>
            )}
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] font-bold text-[#71787b] uppercase tracking-wider block mb-0.5">
              Invoice Reference
            </span>
            <p className="text-xs font-bold text-[#191c1e] flex items-center sm:justify-end gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#71787b] shrink-0" />
              {batch.invoice_number}
            </p>
            <p className="text-[11px] text-[#71787b] mt-0.5">
              Total Products: <strong className="text-[#191c1e]">{batch.items?.length || batch.item_count || 1}</strong>
            </p>
          </div>
        </div>

        {/* Purchased Items Table */}
        <TableContainer className="flex-1 min-h-0 overflow-y-auto my-1.5 print:overflow-visible print:border-none">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Product Specification</TableHead>
                <TableHead className="text-center w-14">Qty</TableHead>
                <TableHead className="text-right w-24">Retail Price</TableHead>
                <TableHead className="text-center w-20">Discount</TableHead>
                <TableHead className="text-right w-24">Unit Cost</TableHead>
                <TableHead className="text-right w-28">Total Line Cost</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {batch.items && batch.items.length > 0 ? (
                batch.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-[#71787b] font-mono font-medium text-[11px]">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#191c1e] flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-[#19444f] shrink-0" />
                          {item.product_name || `Product #${item.product_id}`}
                        </span>
                        {(item.product_type || item.product_size) && (
                          <span className="text-[10px] text-[#71787b] font-medium">
                            Type: {item.product_type || "N/A"} • Size: {item.product_size || "N/A"}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-extrabold text-[#191c1e]">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-[#41484a] font-medium">
                      Rs. {item.unit_retail_price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center text-[#41484a] font-semibold text-[11px]">
                      {item.unit_discount_percent > 0
                        ? `${item.unit_discount_percent}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#41484a]">
                      Rs. {item.unit_cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-[#191c1e]">
                      Rs. {item.total_cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-4 text-center text-[#71787b]">
                    No item details available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Invoice Summary Totals Box */}
        <div className="flex justify-end shrink-0 pt-1">
          <div className="w-full sm:w-64 bg-[#f2f4f6] rounded-lg p-2.5 border border-[#e0e3e5] space-y-1 print:bg-transparent print:border-[#e0e3e5]">
            <div className="flex justify-between text-xs text-[#41484a]">
              <span>Grand Total:</span>
              <span className="font-extrabold text-[#191c1e] text-xs">
                Rs. {batch.total_amount.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs text-[#41484a]">
              <span>Amount Paid:</span>
              <span className="font-semibold text-emerald-700 text-xs">
                Rs. {batch.paid_amount.toFixed(2)}
              </span>
            </div>

            <div className="pt-1 border-t border-[#e0e3e5] flex justify-between text-xs font-bold text-[#191c1e]">
              <span>Balance Due:</span>
              <span className={balanceDue > 0 ? "text-[#ba1a1a] font-extrabold" : "text-[#191c1e] font-bold"}>
                Rs. {balanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Printable Footer */}
        <div className="mt-2 pt-2 border-t border-[#e0e3e5] text-center text-[10px] text-[#71787b] hidden print:block">
          Stock Receipt Invoice • Generated via Fan Management System • Thank you for your business!
        </div>
        <Watermark variant="receipt" />
      </div>

      {/* Embedded CSS for clean printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
