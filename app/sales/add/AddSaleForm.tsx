"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Product } from "@/lib/types/product";
import { Customer } from "@/lib/types/customer";
import { recordSaleAction } from "@/app/actions/sale";
import { createCustomerAction } from "@/app/actions/customer";
import { getNextInvoiceNumberAction } from "@/app/actions/settings";
import theme from "@/theme";
import SearchableSelect, { SelectOption } from "@/app/components/SearchableSelect";
import Toast from "@/app/components/Toast";
import { useI18n } from "@/lib/i18n-context";
import {
  validateName,
  validatePhone,
  validateNumeric,
  validatePercentage,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import {
  ShoppingBag,
  ArrowLeft,
  Plus,
  Trash2,
  Minus,
  User,
  UserPlus,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  Eye,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  PageHeader,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableContainer,
  Badge,
} from "@/ui";

interface SaleRowItem {
  id: string;
  productId: string;
  quantity: string;
  unitRetailPrice: number;
  unitDiscountPercent: number;
  availableStock: number;
}

interface AddSaleFormProps {
  products: Product[];
  customers: Customer[];
}

export default function AddSaleForm({ products, customers: initialCustomers }: AddSaleFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Dynamic Customers list
  const [customersList, setCustomersList] = useState<Customer[]>(initialCustomers);

  // Customer Selection State
  const [selectedCustomerType, setSelectedCustomerType] = useState<"walkin" | "registered" | "custom">("walkin");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("Walk-in Customer");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  // Validation Error States for Customer Registration
  const [customerNameError, setCustomerNameError] = useState<string | null>(null);
  const [customerPhoneError, setCustomerPhoneError] = useState<string | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const customerSelectOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      { value: "", label: "Walk-in Customer (Default)" },
    ];
    customersList.forEach((c) => {
      opts.push({
        value: c.id.toString(),
        label: c.name,
        sublabel: c.phone ? `Phone: ${c.phone}` : undefined,
      });
    });
    opts.push({ value: "custom", label: "+ Other / New Customer Name" });
    return opts;
  }, [customersList]);

  // Handle Save / Register Customer
  const handleSaveCustomer = () => {
    setCustomerNameError(null);
    setCustomerPhoneError(null);
    setErrorMsg(null);

    const name = customerName.trim();
    const phone = customerPhone.trim();

    let hasError = false;

    if (!name || name === "Walk-in Customer") {
      setCustomerNameError("customer name is required");
      hasError = true;
    }

    if (!phone) {
      setCustomerPhoneError("customer phone is required");
      hasError = true;
    }

    if (hasError) return;

    setIsSavingCustomer(true);
    startTransition(async () => {
      const res = await createCustomerAction({ name, phone });
      setIsSavingCustomer(false);

      if (res.success && res.data) {
        const newCust = res.data;
        setCustomersList((prev) => [...prev, newCust]);
        setSelectedCustomerId(newCust.id.toString());
        setSelectedCustomerType("registered");
        setCustomerName(newCust.name);
        setCustomerPhone(newCust.phone || "");
        setToastMsg("Customer registered successfully!");
      } else {
        setErrorMsg(res.message || "Failed to register customer.");
      }
    });
  };

  const activeProducts = useMemo(() => {
    return products.filter((p) => p.status !== "inactive");
  }, [products]);

  const productSelectOptions: SelectOption[] = useMemo(() => {
    return activeProducts.map((p) => ({
      value: p.id.toString(),
      label: p.name,
      sublabel: `${p.type} (${p.size}) • Vendor: ${p.supplier_name || "N/A"} • RP: Rs. ${p.retail_price.toLocaleString()}`,
      badge: p.quantity <= 0 ? "OUT OF STOCK" : `Stock: ${p.quantity}`,
    }));
  }, [activeProducts]);

  // Invoice Date & Invoice Number
  const [todayStr, setTodayStr] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setTodayStr(today);
    getNextInvoiceNumberAction(today).then((num) => {
      setInvoiceNumber(num);
    });
  }, []);

  // Auto-dismiss error message after 5 seconds
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Top Product Search Bar State
  const [entryProductId, setEntryProductId] = useState<string>("");

  // Discount State (default mode 'amount', value '0')
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountValue, setDiscountValue] = useState<string>("0");

  // Committed Items State
  const [items, setItems] = useState<SaleRowItem[]>([]);

  // Payment Status & Paid Amount State
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "unpaid">("paid");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [isPaidAmountManuallySet, setIsPaidAmountManuallySet] = useState(false);

  // Handle Registered Customer Selection
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setSelectedCustomerType("walkin");
      setCustomerName("Walk-in Customer");
      setCustomerPhone("");
      return;
    }

    if (customerId === "custom") {
      setSelectedCustomerType("custom");
      setCustomerName("");
      setCustomerPhone("");
      return;
    }

    const found = customersList.find((c: Customer) => c.id.toString() === customerId);
    if (found) {
      setSelectedCustomerType("registered");
      setCustomerName(found.name);
      setCustomerPhone(found.phone || "");
    }
  };

  // Fixed Top Row: Add product when selected in top entry row (places last entered at top)
  const handleAddNewProduct = (prodId: string) => {
    if (!prodId) return;
    const prod = products.find((p) => p.id.toString() === prodId);
    if (!prod) return;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === prodId);
      if (existingIndex >= 0) {
        const existingItem = prev[existingIndex];
        const currentQty = parseInt(existingItem.quantity) || 0;
        const updatedItem = {
          ...existingItem,
          quantity: (currentQty + 1).toString(),
        };
        const rest = prev.filter((_, idx) => idx !== existingIndex);
        return [updatedItem, ...rest];
      }

      return [
        {
          id: `row-${Date.now()}-${Math.random()}`,
          productId: prodId,
          quantity: "1",
          unitRetailPrice: prod.retail_price,
          unitDiscountPercent: 0,
          availableStock: prod.quantity,
        },
        ...prev,
      ];
    });
  };

  // Update existing committed item
  const updateItem = (id: string, field: keyof SaleRowItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === "productId") {
          const prod = products.find((p) => p.id.toString() === value);
          if (prod) {
            return {
              ...item,
              productId: value,
              unitRetailPrice: prod.retail_price,
              unitDiscountPercent: 0,
              availableStock: prod.quantity,
            };
          }
        }

        return { ...item, [field]: value };
      })
    );
  };

  // Remove specific row
  const removeRow = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const calculatedRows = items.map((item) => {
    const qty = parseInt(item.quantity) || 0;
    const rp = item.unitRetailPrice || 0;
    const totalPrice = rp * qty;

    return {
      ...item,
      qty,
      rp,
      totalPrice,
    };
  });

  const subtotal = calculatedRows.reduce((sum, r) => sum + r.totalPrice, 0);
  const rawDiscountValue = Math.max(0, parseFloat(discountValue) || 0);
  
  // Calculate discount and round off decimal values to nearest digit/integer
  let calculatedDiscount = 0;
  if (discountType === "percent") {
    calculatedDiscount = Math.round((subtotal * rawDiscountValue) / 100);
  } else {
    calculatedDiscount = Math.round(rawDiscountValue);
  }

  const cappedDiscount = Math.min(subtotal, Math.max(0, calculatedDiscount));
  const grandTotal = Math.max(0, subtotal - cappedDiscount);

  // Sync paidAmount when paymentStatus changes or grandTotal updates
  useEffect(() => {
    if (!isPaidAmountManuallySet) {
      if (paymentStatus === "paid") {
        setPaidAmount(grandTotal.toFixed(2));
      } else if (paymentStatus === "unpaid") {
        setPaidAmount("0");
      }
    }
  }, [paymentStatus, grandTotal, isPaidAmountManuallySet]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nameErr = validateName(customerName, "Customer name", 1);
    if (nameErr) {
      setErrorMsg(nameErr);
      focusFirstInvalidInput();
      return;
    }

    if (customerPhone) {
      const phoneErr = validatePhone(customerPhone, "Customer phone", false);
      if (phoneErr) {
        setErrorMsg(phoneErr);
        focusFirstInvalidInput();
        return;
      }
    }

    const validItems = calculatedRows.filter((item) => item.productId && item.qty > 0);

    if (validItems.length === 0) {
      setErrorMsg("Please select at least one product with a valid quantity > 0.");
      focusFirstInvalidInput();
      return;
    }

    for (const item of validItems) {
      if (item.qty > item.availableStock) {
        const prod = products.find((p) => p.id.toString() === item.productId);
        setErrorMsg(
          `Requested quantity (${item.qty}) for "${prod?.name || 'Product'}" exceeds available stock (${item.availableStock}).`
        );
        focusFirstInvalidInput();
        return;
      }
    }

    if (discountType === "percent") {
      const discErr = validatePercentage(discountValue, "Order discount percentage", false);
      if (discErr) {
        setErrorMsg(discErr);
        focusFirstInvalidInput();
        return;
      }
    }

    const paidErr = validateNumeric(paidAmount, "Paid amount", { min: 0 });
    if (paidErr) {
      setErrorMsg(paidErr);
      focusFirstInvalidInput();
      return;
    }

    const numPaid = parseFloat(paidAmount) || 0;

    if (selectedCustomerType !== "registered" && paymentStatus !== "paid") {
      setErrorMsg("Only registered customers can take credit or partial payment. Please save & register the customer first.");
      focusFirstInvalidInput();
      return;
    }

    if (paymentStatus === "paid" && numPaid < grandTotal) {
      setErrorMsg("Paid amount cannot be less than Grand Total for 'Paid' status.");
      focusFirstInvalidInput();
      return;
    }

    const effectiveDiscountPct = subtotal > 0 ? (cappedDiscount / subtotal) * 100 : 0;

    const payload = {
      customer_id: selectedCustomerType === "registered" && selectedCustomerId ? parseInt(selectedCustomerId) : null,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || undefined,
      sale_date: todayStr,
      invoice_number: invoiceNumber,
      payment_status: paymentStatus,
      paid_amount: numPaid,
      items: validItems.map((item) => ({
        product_id: parseInt(item.productId),
        quantity: item.qty,
        unit_retail_price: item.rp,
        unit_discount_percent: effectiveDiscountPct,
      })),
    };

    startTransition(async () => {
      const result = await recordSaleAction(payload);
      if (result.success && result.data) {
        router.push(`/sales/${result.data.id}`);
      } else {
        setErrorMsg(result.error || "Failed to record sale invoice.");
      }
    });
  };

  return (
    <div className="h-full flex flex-col p-2 font-sans overflow-hidden max-w-full space-y-2" style={{ backgroundColor: theme.colors.background }}>
      {/* Top Header & Search Bar */}
      <PageHeader
        title={t("headers.pos")}
        icon={<ShoppingBag className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <div className="flex items-center gap-2">
            <div className="w-72 sm:w-[420px] lg:w-[480px] min-w-[360px]">
              <SearchableSelect
                options={productSelectOptions}
                value={entryProductId}
                onChange={(val) => {
                  handleAddNewProduct(val);
                  setEntryProductId("");
                }}
                placeholder="Search product by type, name, model or size"
              />
            </div>
            <Link href="/sales">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Eye className="w-3.5 h-3.5" />}
              >
                {t("app.sales")}
              </Button>
            </Link>
          </div>
        }
      />

      <Toast message={errorMsg} type="error" onClose={() => setErrorMsg(null)} duration={4000} />
      <Toast message={toastMsg} type="success" onClose={() => setToastMsg(null)} duration={4000} />

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
                    <TableHead className="text-center w-20">Size</TableHead>
                    <TableHead className="text-center w-16">Qty</TableHead>
                    <TableHead className="text-right w-24">RP</TableHead>
                    <TableHead className="text-right w-24">Total</TableHead>
                    <TableHead className="text-center w-8"></TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center bg-surface/50" style={{ color: theme.colors.textMuted }}>
                        <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                        <div className="text-xs font-bold" style={{ color: theme.colors.onSurface }}>No Products Added Yet</div>
                        <div className="text-[11px] mt-0.5" style={{ color: theme.colors.textMuted }}>Search and select products in the search bar above to add them to this sale.</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, idx) => {
                      const calc = calculatedRows[idx];
                      const prod = products.find((p) => p.id.toString() === item.productId);
                      const isStockExceeded = calc.qty > calc.availableStock;

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs font-bold text-center" style={{ color: theme.colors.textMuted }}>{idx + 1}</TableCell>

                          {/* Uneditable Product Name & Info */}
                          <TableCell>
                            <div className="font-bold text-xs" style={{ color: theme.colors.onSurface }}>
                              {prod?.name || "Product"}
                            </div>
                            <div className="text-[10px] font-medium" style={{ color: theme.colors.textMuted }}>
                              Category: {prod?.type || "General"}
                            </div>
                          </TableCell>

                          {/* Product Size */}
                          <TableCell className="text-center">
                            <Badge variant="secondary" size="sm">
                              {prod?.size || "-"}
                            </Badge>
                          </TableCell>

                          {/* Editable Quantity */}
                          <TableCell className="text-center">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.quantity}
                              onChange={(e) => {
                                const clean = e.target.value.replace(/[^0-9]/g, "");
                                updateItem(item.id, "quantity", clean);
                              }}
                              className={`w-14 text-center font-extrabold text-xs py-0.5 px-1 bg-white border rounded focus:outline-none focus:ring-2 transition-all ${
                                isStockExceeded ? "border-red-400 bg-red-50" : "focus:ring-blue-200"
                              }`}
                              style={{ color: isStockExceeded ? theme.colors.errorText : theme.colors.primary, borderColor: isStockExceeded ? theme.colors.errorText : theme.colors.cardBorder }}
                              placeholder="1"
                            />
                          </TableCell>

                          {/* Uneditable Retail Price */}
                          <TableCell className="text-right font-bold text-xs" style={{ color: theme.colors.onSurface }}>
                            {calc.rp.toLocaleString()}
                          </TableCell>

                          {/* Calculated Total Price */}
                          <TableCell className="text-right font-black text-xs" style={{ color: theme.colors.onSurface }}>
                            {calc.totalPrice.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                          </TableCell>

                          {/* Action - Delete button */}
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => removeRow(item.id)}
                              title="Remove item"
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
            <div className="mt-auto pt-1.5 border-t shrink-0 flex flex-wrap items-center justify-between gap-2 p-2" style={{ backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.cardBorder }}>
              <div className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
                Subtotal: <span className="font-bold" style={{ color: theme.colors.onSurface }}>Rs. {subtotal.toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <label className="font-semibold" style={{ color: theme.colors.onSurfaceVariant }}>Discount:</label>

                  {/* Toggle between Amount (Rs) and Percentage (%) */}
                  <div className="inline-flex rounded p-0.5 bg-white text-xs gap-1" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
                    <Button
                      type="button"
                      variant={discountType === "amount" ? "primary" : "ghost"}
                      size="xs"
                      onClick={() => setDiscountType("amount")}
                      className="px-1.5 py-0.5 text-[11px]"
                    >
                      Rs.
                    </Button>
                    <Button
                      type="button"
                      variant={discountType === "percent" ? "primary" : "ghost"}
                      size="xs"
                      onClick={() => setDiscountType("percent")}
                      className="px-1.5 py-0.5 text-[11px]"
                    >
                      %
                    </Button>
                  </div>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={discountValue}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      const parts = raw.split(".");
                      const clean = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
                      setDiscountValue(clean);
                    }}
                    className="w-16 text-right font-bold text-xs rounded py-0.5 px-1.5 focus:outline-none"
                    style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.brandBg}4D`, border: `1px solid ${theme.colors.primary}4D` }}
                    placeholder="0"
                  />

                  {discountType === "percent" && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ color: theme.colors.primary, backgroundColor: `${theme.colors.brandBg}66`, border: `1px solid ${theme.colors.primary}33` }} title="Calculated discount rounded to nearest digit">
                      = Rs. {cappedDiscount.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="pl-2 border-l" style={{ borderColor: theme.colors.cardBorder }}>
                  <span className="font-bold mr-1.5" style={{ color: theme.colors.onSurfaceVariant }}>Net Payable:</span>
                  <span className="text-base font-black" style={{ color: theme.colors.primary }}>
                    Rs. {grandTotal.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </TableContainer>

          {/* RIGHT SIDE: Customer & Payment Cards */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full overflow-hidden bg-white rounded-lg p-2 shadow-xs" style={{ border: `1px solid ${theme.colors.cardBorder}` }}>
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
              {/* Customer Info Card */}
              <Card variant="default" className="p-2 space-y-1.5">
                <h2 className="text-[11px] font-bold flex items-center gap-1.5 pb-1 uppercase tracking-wider" style={{ color: theme.colors.onSurface, borderBottom: `1px solid ${theme.colors.cardBorder}` }}>
                  <User className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                  Customer & Invoice Info
                </h2>

                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold mb-0.5" style={{ color: theme.colors.onSurfaceVariant }}>
                        Customer Selection
                      </label>
                      <SearchableSelect
                        options={customerSelectOptions}
                        value={selectedCustomerId}
                        onChange={(val) => handleCustomerChange(val)}
                        placeholder="Search customer..."
                      />
                    </div>

                    <Input
                      label="Customer Name *"
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setCustomerNameError(null);
                      }}
                      required
                      error={customerNameError || undefined}
                      sizeVariant="sm"
                      placeholder="Customer Name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Phone Number"
                      type="text"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        setCustomerPhoneError(null);
                      }}
                      error={customerPhoneError || undefined}
                      sizeVariant="sm"
                      placeholder="0300-1234567"
                    />

                    <Input
                      label="Invoice #"
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                      sizeVariant="sm"
                    />
                  </div>

                  <Input
                    label="Sale Date"
                    type="date"
                    value={todayStr}
                    onChange={(e) => setTodayStr(e.target.value)}
                    required
                    sizeVariant="sm"
                  />

                  {/* Register Customer Button */}
                  {selectedCustomerType !== "registered" && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleSaveCustomer}
                        disabled={isPending || isSavingCustomer}
                        className="w-full"
                        leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                      >
                        {isSavingCustomer ? "Registering..." : "Save & Register Customer"}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Payment Details Card */}
              <Card variant="default" className="p-2 space-y-1.5">
                <h2 className="text-[11px] font-bold flex items-center gap-1.5 pb-1 uppercase tracking-wider" style={{ color: theme.colors.onSurface, borderBottom: `1px solid ${theme.colors.cardBorder}` }}>
                  <DollarSign className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                  Payment Details
                </h2>

                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      label="Payment Status *"
                      value={paymentStatus}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        if (selectedCustomerType !== "registered" && val !== "paid") {
                          setErrorMsg("Only registered customers can take credit or partial payment. Please save & register the customer first.");
                          return;
                        }
                        setPaymentStatus(val);
                        setIsPaidAmountManuallySet(false);
                      }}
                      sizeVariant="sm"
                    >
                      <option value="paid">Full Paid</option>
                      <option value="partial">
                        Partial Payment {selectedCustomerType !== "registered" ? "(Registered Only)" : ""}
                      </option>
                      <option value="unpaid">
                        Unpaid / Credit {selectedCustomerType !== "registered" ? "(Registered Only)" : ""}
                      </option>
                    </Select>

                    <Input
                      label="Paid Amount (PKR) *"
                      type="text"
                      inputMode="decimal"
                      value={paidAmount}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        const parts = raw.split(".");
                        const clean = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
                        setPaidAmount(clean);
                        setIsPaidAmountManuallySet(true);
                      }}
                      sizeVariant="sm"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold mb-0.5" style={{ color: theme.colors.onSurfaceVariant }}>
                      Remaining Balance Owed
                    </label>
                    <div className="p-1.5 font-bold text-xs text-right rounded-md" style={{ border: `1px solid ${theme.colors.cardBorder}`, backgroundColor: theme.colors.surfaceContainerLow, color: theme.colors.onSurface }}>
                      Rs. {Math.max(0, grandTotal - (parseFloat(paidAmount) || 0)).toLocaleString("en-PK", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Pinned Submit Button Footer */}
            <div className="pt-2 border-t shrink-0 flex items-center justify-end gap-2 bg-white" style={{ borderColor: theme.colors.cardBorder }}>
              <Link href="/sales">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                >
                  Cancel
                </Button>
              </Link>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isPending}
                leftIcon={
                  isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )
                }
              >
                {isPending ? "Recording..." : "Record Sale & View Invoice"}
              </Button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
