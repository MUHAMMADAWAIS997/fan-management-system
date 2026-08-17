"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/lib/types/product";
import { Supplier } from "@/lib/types/supplier";
import { PaymentStatus } from "@/lib/types/stock";
import { receiveStockAction } from "@/app/actions/stock";
import SearchableSelect, { SelectOption } from "@/app/components/SearchableSelect";
import Toast from "@/app/components/Toast";
import { useI18n } from "@/lib/i18n-context";
import {
  validateRequiredText,
  validateNumeric,
  validatePercentage,
  validateDropdown,
  validateDate,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import theme from "@/theme";
import {
  ShoppingCart,
  Building2,
  Package,
  FileText,
  CreditCard,
  AlertCircle,
  Save,
  Minus,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  PageHeader,
  Card,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableContainer,
} from "@/ui";

interface StockFormProps {
  products: Product[];
  companies: Supplier[];
}

interface FormStockItem {
  id: string;
  productId: string;
  quantity: string;
  unitRetailPrice: string;
  unitDiscountPercent: string;
}

export default function StockForm({ products, companies }: StockFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { t } = useI18n();
  // Initial date helper: YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Header Batch Form State
  const [companyId, setCompanyId] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(todayStr);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-${Date.now().toString().slice(-6)}`
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [entryProductId, setEntryProductId] = useState<string>("");

  // Filter active products
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.status !== "inactive");
  }, [products]);

  const companySelectOptions: SelectOption[] = useMemo(() => {
    return companies.map((c) => ({
      value: String(c.id),
      label: c.name,
      sublabel: c.phone ? `Phone: ${c.phone}` : undefined,
    }));
  }, [companies]);

  const productSelectOptions: SelectOption[] = useMemo(() => {
    return activeProducts.map((p) => ({
      value: String(p.id),
      label: p.name,
      sublabel: `${p.type} (${p.size}) • Vendor: ${p.supplier_name || "N/A"} • RP: Rs. ${p.retail_price.toLocaleString()}`,
      badge: `Stock: ${p.quantity}`,
    }));
  }, [activeProducts]);

  // Committed Items State (starts empty, items added via top search bar)
  const [items, setItems] = useState<FormStockItem[]>([]);

  // Errors State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-dismiss error message after 5 seconds
  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => {
        setFormError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [formError]);

  // Calculate row totals and grand total
  const { rowCalculations, grandTotalCost } = useMemo(() => {
    let grandTotal = 0;
    const rowCalcs = items.map((item) => {
      if (!item.productId) {
        return { unitCost: "0.00", totalCost: "0.00" };
      }

      const rp = parseFloat(item.unitRetailPrice) || 0;
      const discPct = parseFloat(item.unitDiscountPercent) || 0;
      const qty = parseInt(item.quantity, 10) || 0;

      const uCost = Math.max(0, rp * (1 - discPct / 100));
      const tCost = uCost * qty;

      grandTotal += tCost;

      return {
        unitCost: uCost.toFixed(2),
        totalCost: tCost.toFixed(2),
      };
    });

    return {
      rowCalculations: rowCalcs,
      grandTotalCost: grandTotal.toFixed(2),
    };
  }, [items]);

  // Sync paidAmount automatically when paymentStatus changes or grandTotalCost updates
  useEffect(() => {
    if (paymentStatus === "paid") {
      setPaidAmount(grandTotalCost);
    } else if (paymentStatus === "unpaid") {
      setPaidAmount("0.00");
    }
  }, [paymentStatus, grandTotalCost]);

  // Modal State for Adding / Prompting Stock Item details
  const [selectedModalProduct, setSelectedModalProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState<string>("1");
  const [modalRetailPrice, setModalRetailPrice] = useState<string>("");
  const [modalDiscountPercent, setModalDiscountPercent] = useState<string>("0");
  const [modalError, setModalError] = useState<string | null>(null);

  // Open Pop-up Modal on selecting a product from top search
  const handleOpenProductModal = (selectedProdId: string) => {
    if (!selectedProdId) return;

    const selectedProduct = activeProducts.find((p) => String(p.id) === selectedProdId);
    if (!selectedProduct) return;

    const defaultRp = String(selectedProduct.retail_price || 0);
    let defaultDiscPct = "0";
    if (selectedProduct.retail_price > 0 && selectedProduct.discount > 0) {
      defaultDiscPct = Number(((selectedProduct.discount / selectedProduct.retail_price) * 100).toFixed(1)).toString();
    }

    setSelectedModalProduct(selectedProduct);
    setModalQuantity("1");
    setModalRetailPrice(defaultRp);
    setModalDiscountPercent(defaultDiscPct);
    setModalError(null);
  };

  // Confirm modal and set item data into stock table
  const handleConfirmModalAdd = () => {
    if (!selectedModalProduct) return;

    const numQty = parseInt(modalQuantity, 10) || 0;
    const numRP = parseFloat(modalRetailPrice) || 0;
    const numDisc = parseFloat(modalDiscountPercent) || 0;

    if (numQty <= 0) {
      setModalError("Quantity must be at least 1.");
      return;
    }

    if (numRP < 0) {
      setModalError("Retail Price cannot be negative.");
      return;
    }

    if (numDisc < 0 || numDisc > 100) {
      setModalError("Discount percentage must be between 0% and 100%.");
      return;
    }

    const prodIdStr = String(selectedModalProduct.id);

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === prodIdStr);

      if (existingIndex >= 0) {
        const existingItem = prev[existingIndex];
        const currentQty = parseInt(existingItem.quantity, 10) || 0;
        const updatedItem = {
          ...existingItem,
          quantity: (currentQty + numQty).toString(),
          unitRetailPrice: modalRetailPrice,
          unitDiscountPercent: modalDiscountPercent,
        };
        const rest = prev.filter((_, idx) => idx !== existingIndex);
        return [updatedItem, ...rest];
      }

      return [
        {
          id: `item-${Date.now()}-${Math.random()}`,
          productId: prodIdStr,
          quantity: modalQuantity,
          unitRetailPrice: modalRetailPrice,
          unitDiscountPercent: modalDiscountPercent,
        },
        ...prev,
      ];
    });

    setSelectedModalProduct(null);
    if (fieldErrors.items) {
      setFieldErrors((prev) => ({ ...prev, items: [] }));
    }
  };

  const handleItemFieldChange = (
    id: string,
    field: keyof FormStockItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleRemoveItemRow = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const errors: Record<string, string[]> = {};

    const compErr = validateDropdown(companyId, "Supplier/Company");
    if (compErr) errors.company_id = [compErr];

    const dateErr = validateDate(purchaseDate, "Purchase date");
    if (dateErr) errors.purchase_date = [dateErr];

    const invErr = validateRequiredText(invoiceNumber, "Invoice number", 1);
    if (invErr) errors.invoice_number = [invErr];

    const paidErr = validateNumeric(paidAmount, "Paid amount", { min: 0 });
    if (paidErr) errors.paid_amount = [paidErr];

    const validItems = items.filter(
      (item) => item.productId && (parseInt(item.quantity, 10) || 0) > 0
    );

    if (validItems.length === 0) {
      errors.items = ["Please add at least one product line item with quantity > 0."];
    } else {
      for (const item of validItems) {
        const qtyErr = validateNumeric(item.quantity, "Quantity", { min: 1, integerOnly: true });
        const rpErr = validateNumeric(item.unitRetailPrice, "Unit Retail Price", { min: 0 });
        const discErr = validatePercentage(item.unitDiscountPercent, "Discount");
        if (qtyErr || rpErr || discErr) {
          errors.items = [qtyErr || rpErr || discErr || "Invalid item row value."];
          break;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Please correct the highlighted errors before submitting.");
      focusFirstInvalidInput();
      return;
    }

    startTransition(async () => {
      const payload = {
        company_id: Number(companyId),
        purchase_date: purchaseDate,
        invoice_number: invoiceNumber.trim(),
        payment_status: paymentStatus,
        paid_amount: Number(paidAmount) || 0,
        items: validItems.map((item) => ({
          product_id: Number(item.productId),
          quantity: Number(item.quantity),
          unit_retail_price: Number(item.unitRetailPrice),
          unit_discount_percent: Number(item.unitDiscountPercent),
        })),
      };

      const res = await receiveStockAction(payload);
      if (res.success) {
        router.push("/receive-stock");
        router.refresh();
      } else {
        setFormError(res.message || "Failed to save stock batch.");
        if (res.errors) {
          setFieldErrors(res.errors);
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col p-2 overflow-hidden max-w-full space-y-2">
      {/* Top Header & Search Bar */}
      <PageHeader
        title={t("receive_stock.header")}
        subtitle={t("receive_stock.subtitle")}
        icon={<ShoppingCart className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <div className="flex items-center gap-2">
            <div className="w-72 sm:w-[420px] lg:w-[480px] min-w-[360px]">
              <SearchableSelect
                options={productSelectOptions}
                value={entryProductId}
                onChange={(val) => {
                  handleOpenProductModal(val);
                  setEntryProductId("");
                }}
                placeholder="Search product by type, name, model or size"
              />
            </div>
            <Link href="/receive-stock">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Eye className="w-3.5 h-3.5" />}
              >
                {t("receive_stock.view_batches")}
              </Button>
            </Link>
          </div>
        }
      />

      <Toast message={formError} type="error" onClose={() => setFormError(null)} duration={4000} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-2">
        {/* Main Grid Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 min-h-0 overflow-hidden">

          {/* LEFT SIDE: Products Table Container */}
          <TableContainer className="lg:col-span-7 xl:col-span-8 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto min-h-0">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead className="w-7 text-center">#</TableHead>
                    <TableHead className="min-w-[180px]">Product Name / Item</TableHead>
                    <TableHead className="text-center w-16">Qty</TableHead>
                    <TableHead className="text-right w-20">RP</TableHead>
                    <TableHead className="text-right w-20">Disc %</TableHead>
                    <TableHead className="text-right w-24">Unit Cost</TableHead>
                    <TableHead className="text-right w-24">Total</TableHead>
                    <TableHead className="text-center w-8"></TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center bg-[#f2f4f6]/50" style={{ color: theme.colors.textMuted }}>
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <div className="text-xs font-bold" style={{ color: theme.colors.onSurface }}>No Products Added Yet</div>
                        <div className="text-[11px] mt-0.5" style={{ color: theme.colors.textMuted }}>Search and select products in the search bar above to add them to this stock batch.</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, idx) => {
                      const calc = rowCalculations[idx];
                      const prod = activeProducts.find((p) => String(p.id) === item.productId);

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-bold text-center" style={{ color: theme.colors.textMuted }}>
                            {idx + 1}
                          </TableCell>

                          {/* Uneditable Product Name & Details */}
                          <TableCell>
                            <div className="font-bold text-xs" style={{ color: theme.colors.onSurface }}>
                              {prod?.name || "Product"}
                            </div>
                            <div className="text-[10px] font-medium" style={{ color: theme.colors.textMuted }}>
                              {prod?.type} - {prod?.size} â€¢ Current Stock: {prod?.quantity}
                            </div>
                          </TableCell>

                          {/* Quantity Input */}
                          <TableCell className="text-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemFieldChange(
                                  item.id,
                                  "quantity",
                                  e.target.value.replace(/[^0-9]/g, "")
                                )
                              }
                              placeholder="1"
                              disabled={isPending}
                              className="w-14 text-center font-extrabold text-xs py-1 px-1 bg-white rounded focus:outline-none focus:ring-2 transition-all"
                              style={{ color: theme.colors.primary, border: `1px solid ${theme.colors.cardBorder}`, outlineColor: `${theme.colors.primary}33` }}
                            />
                          </TableCell>

                          {/* Retail Price (RP) Input */}
                          <TableCell className="text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.unitRetailPrice}
                              onChange={(e) =>
                                handleItemFieldChange(
                                  item.id,
                                  "unitRetailPrice",
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              disabled={isPending}
                              className="w-20 text-right font-medium text-xs py-1 px-1 bg-white rounded focus:outline-none focus:ring-2 transition-all"
                              style={{ color: theme.colors.onSurface, border: `1px solid ${theme.colors.cardBorder}`, outlineColor: `${theme.colors.primary}33` }}
                            />
                          </TableCell>

                          {/* Discount Percent (%) Input */}
                          <TableCell className="text-right">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={item.unitDiscountPercent}
                              onChange={(e) =>
                                handleItemFieldChange(
                                  item.id,
                                  "unitDiscountPercent",
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              disabled={isPending}
                              className="w-16 text-right font-medium text-xs py-1 px-1 bg-white rounded focus:outline-none focus:ring-2 transition-all"
                              style={{ color: theme.colors.warningText, border: `1px solid ${theme.colors.cardBorder}`, outlineColor: `${theme.colors.primary}33` }}
                            />
                          </TableCell>

                          {/* Auto Calculated Unit Cost */}
                          <TableCell className="text-right font-bold text-xs" style={{ color: theme.colors.primary }}>
                            Rs. {parseFloat(calc.unitCost).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                          </TableCell>

                          {/* Calculated Row Total Cost */}
                          <TableCell className="text-right font-black text-xs" style={{ color: theme.colors.onSurface }}>
                            Rs. {parseFloat(calc.totalCost).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                          </TableCell>

                          {/* Discard Action Button */}
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => handleRemoveItemRow(item.id)}
                              title="Discard product line item"
                            >
                              <Minus className="w-3.5 h-3.5" style={{ color: theme.colors.errorText }} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pinned Table Summary Footer */}
            <div className="mt-auto pt-1.5 border-t shrink-0 flex items-center justify-between gap-2 p-2" style={{ backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.cardBorder }}>
              <div className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
                Line Items: <span className="font-bold" style={{ color: theme.colors.onSurface }}>{items.length} items</span>
              </div>

              <div className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
                Total Cost:{" "}
                <span className="font-extrabold text-sm ml-1" style={{ color: theme.colors.onSurface }}>
                  Rs. {parseFloat(grandTotalCost).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </TableContainer>

          {/* RIGHT SIDE: Supplier, Batch & Payment Cards Stack */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full justify-between gap-2 overflow-y-auto">
            <div className="space-y-2">
              
              {/* CARD 1: Batch & Supplier Info */}
              <Card variant="default">
                <div className="flex items-center gap-1.5 pb-2 mb-2 border-b text-xs font-bold uppercase tracking-wide" style={{ color: theme.colors.onSurface, borderColor: theme.colors.cardBorder }}>
                  <Building2 className="w-4 h-4" style={{ color: theme.colors.primary }} />
                  <span>Batch & Supplier Details</span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.onSurfaceVariant }}>
                      Supplier / Company <span style={{ color: theme.colors.errorText }}>*</span>
                    </label>
                    <SearchableSelect
                      options={companySelectOptions}
                      value={companyId}
                      onChange={(val) => {
                        setCompanyId(val);
                        if (fieldErrors.company_id)
                          setFieldErrors((prev) => ({ ...prev, company_id: [] }));
                      }}
                      placeholder="Search supplier..."
                      disabled={isPending}
                    />
                    {fieldErrors.company_id?.[0] && (
                      <p className="mt-1 text-xs font-semibold flex items-center gap-1" style={{ color: theme.colors.errorText }}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Supplier is required</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Purchase Date *"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      disabled={isPending}
                      sizeVariant="sm"
                    />

                    <Input
                      label="Invoice # *"
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-12345"
                      disabled={isPending}
                      sizeVariant="sm"
                    />
                  </div>
                </div>
              </Card>

              {/* CARD 2: Payment Details */}
              <Card variant="default">
                <div className="flex items-center gap-1.5 pb-2 mb-2 border-b text-xs font-bold uppercase tracking-wide" style={{ color: theme.colors.onSurface, borderColor: theme.colors.cardBorder }}>
                  <CreditCard className="w-4 h-4" style={{ color: theme.colors.primary }} />
                  <span>Payment Details</span>
                </div>

                <div className="space-y-2.5">
                  <Select
                    label="Payment Status *"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    disabled={isPending}
                    sizeVariant="sm"
                  >
                    <option value="paid">{t("receive_stock.full_paid")}</option>
                    <option value="partial">{t("receive_stock.partial_paid")}</option>
                    <option value="unpaid">{t("receive_stock.unpaid")}</option>
                  </Select>

                  <Input
                    label="Paid Amount (Rs.) *"
                    type="text"
                    inputMode="decimal"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isPending}
                    sizeVariant="sm"
                  />

                  <div className="p-2 rounded-md flex items-center justify-between text-xs font-bold" style={{ backgroundColor: `${theme.colors.brandBg}4D`, border: `1px solid ${theme.colors.primary}33`, color: theme.colors.primary }}>
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                      Total Cost:
                    </span>
                    <span className="text-sm font-extrabold" style={{ color: theme.colors.primary }}>
                      Rs. {parseFloat(grandTotalCost).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Pinned Submit Button Section */}
            <div className="bg-white p-2.5 rounded-lg shadow-xs flex items-center justify-end space-x-2 shrink-0" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => router.push("/receive-stock")}
                disabled={isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isPending}
                leftIcon={
                  isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )
                }
              >
                {isPending ? "Processing Batch..." : "Save Stock Batch"}
              </Button>
            </div>

          </div>

        </div>
      </form>

      {/* Add Stock Item Pop-up Modal */}
      <Modal
        isOpen={Boolean(selectedModalProduct)}
        onClose={() => setSelectedModalProduct(null)}
        title={selectedModalProduct?.name || "Add Product"}
        subtitle={selectedModalProduct ? `${selectedModalProduct.type} â€¢ Size: ${selectedModalProduct.size} â€¢ Current Stock: ${selectedModalProduct.quantity}` : undefined}
        maxWidth="md"
      >
        {modalError && (
          <div className="mb-3 p-2 rounded text-xs font-semibold flex items-center gap-1.5" style={{ backgroundColor: theme.colors.errorBg, borderColor: theme.colors.errorBg, color: theme.colors.errorText }}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <Input
            label="Quantity Received *"
            type="text"
            inputMode="numeric"
            value={modalQuantity}
            onChange={(e) => {
              const clean = e.target.value.replace(/[^0-9]/g, "");
              setModalQuantity(clean);
              setModalError(null);
            }}
            autoFocus
            placeholder="Enter quantity (e.g. 10)"
            sizeVariant="sm"
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Input
              label="Retail Price (RP) *"
              type="text"
              inputMode="decimal"
              value={modalRetailPrice}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "");
                const parts = raw.split(".");
                const clean = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
                setModalRetailPrice(clean);
                setModalError(null);
              }}
              placeholder="Retail Price"
              sizeVariant="sm"
            />

            <Input
              label="Discount (%)"
              type="text"
              inputMode="decimal"
              value={modalDiscountPercent}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "");
                const parts = raw.split(".");
                const clean = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
                setModalDiscountPercent(clean);
                setModalError(null);
              }}
              placeholder="Discount %"
              sizeVariant="sm"
            />
          </div>

          {/* Live Calculated Unit Cost & Line Total Preview */}
          <div className="p-2.5 rounded-md flex items-center justify-between text-xs" style={{ backgroundColor: theme.colors.surfaceContainerLow, border: `1px solid ${theme.colors.cardBorder}` }}>
            <div>
              <span className="text-[10px] uppercase font-bold block" style={{ color: theme.colors.textMuted }}>Unit Cost (Auto)</span>
              <span className="font-extrabold text-xs" style={{ color: theme.colors.primary }}>
                Rs. {(Math.max(0, (parseFloat(modalRetailPrice) || 0) * (1 - (parseFloat(modalDiscountPercent) || 0) / 100))).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold block" style={{ color: theme.colors.textMuted }}>Total Batch Cost</span>
              <span className="font-black text-sm" style={{ color: theme.colors.onSurface }}>
                Rs. {((Math.max(0, (parseFloat(modalRetailPrice) || 0) * (1 - (parseFloat(modalDiscountPercent) || 0) / 100))) * (parseInt(modalQuantity, 10) || 0)).toLocaleString("en-PK", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t" style={{ borderColor: theme.colors.cardBorder }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSelectedModalProduct(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleConfirmModalAdd}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Add to Stock Table
          </Button>
        </div>
      </Modal>
    </div>
  );
}
