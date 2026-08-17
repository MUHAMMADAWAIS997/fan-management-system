"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sale } from "@/lib/types/sale";
import { PrinterConfig } from "@/lib/services/printer.service";
import { InvoiceSettings } from "@/lib/services/invoice_settings.service";
import theme from "@/theme";
import { Printer, ArrowLeft } from "lucide-react";
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

interface SaleInvoiceViewProps {
  sale: Sale;
  printerConfig?: PrinterConfig;
  invoiceSettings?: InvoiceSettings;
}

export default function SaleInvoiceView({
  sale,
  printerConfig,
  invoiceSettings,
}: SaleInvoiceViewProps) {
  // Use printerConfig paperType to set default view format
  const initialFormat =
    printerConfig?.paperType?.startsWith("thermal") ? "thermal" : "a4";
  const [printFormat, setPrintFormat] = useState<"a4" | "thermal">(initialFormat);

  // Auto print if configured in Settings
  useEffect(() => {
    if (printerConfig?.autoPrintInvoice) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [printerConfig?.autoPrintInvoice]);

  const handlePrint = () => {
    window.print();
  };

  // Business / Shop Info: Prefer sale's snapshot (for old invoices), fallback to settings/default
  const shopName = sale.shop_name || invoiceSettings?.shopName || "WAHID ELECTRONICS";
  const shopTagline =
    sale.shop_tagline || invoiceSettings?.tagline || "Authorized Electronics & Fan Retailer";
  const shopPhone =
    sale.shop_phone || invoiceSettings?.phoneNumber || "+92 300 1234567";
  const shopAddress =
    sale.shop_address || invoiceSettings?.address || "Main Market Road, City Center";

  const balanceDue = Math.max(0, sale.total_amount - sale.paid_amount);

  // Calculate gross total and discount given across line items
  const totalGrossAmount =
    sale.items?.reduce(
      (sum, item) => sum + item.unit_retail_price * item.quantity,
      0
    ) || sale.total_amount;

  const totalDiscountGiven =
    sale.items?.reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          (item.unit_retail_price - item.unit_sale_price) * item.quantity
        ),
      0
    ) || 0;

  const thermalWidthClass =
    printerConfig?.paperType === "thermal_58mm" ? "w-[58mm]" : "w-[80mm]";

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="success" size="sm">Full Paid</Badge>;
      case "partial":
        return <Badge variant="warning" size="sm">Partial Paid</Badge>;
      case "unpaid":
        return <Badge variant="danger" size="sm">Unpaid / Credit</Badge>;
      default:
        return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col p-2 sm:p-3 overflow-hidden w-full print:p-0 print:max-w-none print:h-auto print:overflow-visible space-y-2.5">
      {/* Top Action Bar (Hidden on Print, Fixed Height) */}
      <div className="print:hidden">
        <PageHeader
          title={`Sale Invoice #${sale.invoice_number}`}
          subtitle={`Customer: ${sale.customer_name}`}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/sales">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                >
                  Back to Sales
                </Button>
              </Link>
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

      {/* Invoice Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {printFormat === "a4" ? (
          /* A4 STANDARD INVOICE LAYOUT */
          <div
            id="printable-area"
            className="bg-white rounded-xl border border-black shadow-xs p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden print:border-none print:shadow-none print:p-2 print:overflow-visible print:h-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-black pb-1 mb-1 shrink-0">
              <div>
                <h2 className="text-base font-black text-black tracking-tight uppercase">
                  {shopName}
                </h2>
                <p className="text-[10px] text-black font-medium mt-0.5">
                  {shopTagline}
                </p>
                <p className="text-[10px] text-black">
                  {shopAddress} • Phone: {shopPhone}
                </p>
              </div>

              <div className="text-right">
                <Badge variant="brand" size="sm" className="mb-0.5 uppercase tracking-wider">
                  Sale Invoice
                </Badge>
                <h3 className="text-sm font-extrabold text-black">
                  #{sale.invoice_number}
                </h3>
                <p className="text-[10px] text-black">Date: {sale.sale_date}</p>
              </div>
            </div>

            {/* Customer & Payment Info */}
            <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-[#f2f4f6] border border-black mb-1 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-black">
                  Billed To
                </p>
                <h4 className="text-xs font-bold text-black mt-0.5">
                  {sale.customer_name}
                </h4>
                {sale.customer_phone && (
                  <p className="text-[11px] text-black font-medium">
                    Phone: {sale.customer_phone}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-black">
                  Payment Details
                </p>
                <div className="mt-0.5">
                  {getPaymentBadge(sale.payment_status)}
                </div>
                <p className="text-[11px] text-black mt-0.5 font-medium">
                  Paid: Rs.{" "}
                  {sale.paid_amount.toLocaleString("en-PK", {
                    minimumFractionDigits: 2,
                  })}
                </p>
                {balanceDue > 0 && (
                  <p className="text-[11px] text-[#ba1a1a] font-bold">
                    Balance Due: Rs.{" "}
                    {balanceDue.toLocaleString("en-PK", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Items Table with Internal Scrollbar */}
            <TableContainer className="flex-1 min-h-0 overflow-y-auto my-1.5 print:overflow-visible print:border-none">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead className="w-8 text-center">#</TableHead>
                    <TableHead>Item Description</TableHead>
                    <TableHead className="text-center w-14">Qty</TableHead>
                    <TableHead className="text-right w-24">Retail Price</TableHead>
                    <TableHead className="text-right w-20">Discount</TableHead>
                    <TableHead className="text-right w-24">Unit Price</TableHead>
                    <TableHead className="text-right w-28">Total (PKR)</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {sale.items?.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-black font-bold text-[11px]">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-black">
                        {item.product_name}
                        <span className="text-[10px] text-black font-medium block">
                          Category: {item.product_type}{" "}
                          {item.product_size ? `• Size: ${item.product_size}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-extrabold text-black">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-black font-medium">
                        Rs. {item.unit_retail_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-black text-[11px]">
                        {item.unit_discount_percent > 0
                          ? `${item.unit_discount_percent.toFixed(1)}%`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-black">
                        Rs.{" "}
                        {item.unit_sale_price.toLocaleString("en-PK", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-black">
                        Rs.{" "}
                        {item.total_price.toLocaleString("en-PK", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Invoice Summary Totals */}
            <div className="flex justify-end shrink-0 pt-1">
              <div className="w-full sm:w-64 bg-[#f2f4f6] rounded-lg p-2.5 border border-black space-y-1 text-xs print:bg-transparent print:border-black">
                {totalDiscountGiven > 0 && (
                  <>
                    <div className="flex justify-between text-black">
                      <span>Gross Subtotal:</span>
                      <span className="font-semibold">
                        Rs.{" "}
                        {totalGrossAmount.toLocaleString("en-PK", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount Given:</span>
                      <span>
                        -Rs.{" "}
                        {totalDiscountGiven.toLocaleString("en-PK", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-black">
                  <span>Paid Amount:</span>
                  <span className="font-bold text-emerald-700">
                    Rs.{" "}
                    {sale.paid_amount.toLocaleString("en-PK", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-extrabold text-black border-t pt-1 border-black">
                  <span>Grand Total:</span>
                  <span className="text-[#19444f]">
                    Rs.{" "}
                    {sale.total_amount.toLocaleString("en-PK", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between text-xs font-extrabold text-[#ba1a1a] pt-0.5">
                    <span>Balance Due:</span>
                    <span>
                      Rs.{" "}
                      {balanceDue.toLocaleString("en-PK", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-black pt-1.5 mt-1 text-center text-[10px] text-black shrink-0">
              <p className="font-semibold text-black uppercase">
                Thank you for visiting {shopName}!
              </p>
              <p>
                This is a computer-generated invoice and requires no physical signature.
              </p>
            </div>
            <Watermark variant="receipt" />
          </div>
        ) : (
          /* THERMAL POS RECEIPT LAYOUT */
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div
              id="printable-area"
              className={`mx-auto ${thermalWidthClass} p-3 bg-white border border-gray-300 rounded shadow-xs font-mono text-[11px] text-black print:shadow-none print:border-none print:${thermalWidthClass} print:p-0`}
            >
              <div className="text-center border-b pb-1 mb-1 ">
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  {shopName}
                </h2>
                <p className="text-[10px] font-semibold text-black">{shopAddress}</p>
                <p className="text-[10px] font-semibold text-black">Tel: {shopPhone}</p>
              </div>

              <div className="space-y-0.5 mb-1 text-[10px] border-b pb-1 ">
                <div className="flex ">
                  <span>Inv #:</span>
                  <span className="font-bold">{sale.invoice_number}</span>
                </div>
                <div className="flex relative font-bold">
                  <span>Date:</span>
                  <span className="font-semibold mr-10">{sale.sale_date}</span>
                  <span>Customer:</span>
                  <span className="font-semibold ">{sale.customer_name}</span>
                </div>


              </div>

              {/* Itemized Table */}
              <div className="border-b border-dashed pb-1 mb-1 ">
                <div className="flex font-bold text-[10px] uppercase border-b pb-1 mb-1 text-black">
                  <span className="w-1/2">Item</span>
                  <span className="w-1/6 text-center">Qty</span>
                  <span className="w-1/3 text-right">Amount</span>
                </div>

                {sale.items?.map((item) => (
                  <div
                    key={item.id}
                    className="py-1 text-[10px] border-b border-[#f2f4f6] last:border-none"
                  >
                    <div className="font-bold text-black">{item.product_name}</div>
                    <div className="flex justify-between text-black text-[10px]">
                      <span>
                        {item.quantity} x Rs. {item.unit_retail_price.toFixed(0)}
                      </span>
                      <span className="font-bold text-black text-[10px]">
                        Rs. {(item.unit_retail_price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals & Discount Summary */}
              <div className="space-y-0.5 text-[10px] border-b border-dashed pb-1 mb-1 ">
                {totalDiscountGiven > 0 && (
                  <>
                    <div className="flex justify-between text-black">
                      <span>GROSS TOTAL:</span>
                      <span>Rs. {totalGrossAmount.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-black font-bold">
                      <span>DISCOUNT:</span>
                      <span>-Rs. {totalDiscountGiven.toFixed(0)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-black text-black">
                  <span>NET TOTAL:</span>
                  <span>Rs. {sale.total_amount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-semibold text-black">
                  <span>PAID:</span>
                  <span>Rs. {sale.paid_amount.toFixed(0)}</span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-[#ba1a1a]">
                    <span>BALANCE DUE:</span>
                    <span>Rs. {balanceDue.toFixed(0)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-black space-y-0.5">
                <p className="font-bold text-black uppercase">
                  THANK YOU FOR VISITING {shopName}!
                </p>
                <p>Goods once sold are non-refundable.</p>
              </div>
              <Watermark variant="receipt" />
            </div>
          </div>
        )}
      </div>

      {/* Embedded CSS for clean printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area,
          #printable-area * {
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
