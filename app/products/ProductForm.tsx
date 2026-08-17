"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types/product";
import { Supplier } from "@/lib/types/supplier";
import { useI18n } from "@/lib/i18n-context";
import {
  createProductAction,
  updateProductAction,
} from "@/app/actions/product";
import Toast from "@/app/components/Toast";
import SearchableSelect, { SelectOption } from "@/app/components/SearchableSelect";
import theme from "@/theme";
import { Button, Input, Select, Card, PageHeader } from "@/ui";
import {
  Package,
  ArrowLeft,
  Tag,
  Ruler,
  Layers,
  Calculator,
  AlertCircle,
  FileText,
  Save,
  Hash,
  Edit3,
  ChevronDown,
  Percent,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

import {
  validateName,
  validateRequiredText,
  validateNumeric,
  validatePercentage,
  validateDropdown,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";

const STANDARD_PRODUCT_TYPES = [
  "Ceiling Fan",
  "Pedestal Fan",
  "Bracket Fan",
  "Exhaust Fan",
  "Louver Fan",
  "Table Fan",
];

interface ProductFormProps {
  initialProduct?: Product;
  suppliers: Supplier[];
}

export default function ProductForm({
  initialProduct,
  suppliers,
}: ProductFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditMode = Boolean(initialProduct);

  // Determine initial type selection state
  const initialType = initialProduct?.type || STANDARD_PRODUCT_TYPES[0];
  const isStandardType = STANDARD_PRODUCT_TYPES.includes(initialType);

  // Form State
  const [name, setName] = useState(initialProduct?.name || "");
  const [description, setDescription] = useState(initialProduct?.description || "");
  const [status, setStatus] = useState<string>(initialProduct?.status || "active");

  // Type dropdown & custom type state
  const [selectedTypeSelect, setSelectedTypeSelect] = useState<string>(
    isStandardType ? initialType : "Other"
  );
  const [customType, setCustomType] = useState<string>(
    isStandardType ? "" : initialType
  );

  const [size, setSize] = useState(initialProduct?.size || "");
  const [supplierId, setSupplierId] = useState<string>(
    initialProduct
      ? String(initialProduct.supplier_id)
      : suppliers.length > 0
        ? String(suppliers[0].id)
        : ""
  );

  // Default quantity to 1 when adding new product
  const [quantity, setQuantity] = useState(
    initialProduct ? String(initialProduct.quantity) : "1"
  );
  const [retailPrice, setRetailPrice] = useState(
    initialProduct ? String(initialProduct.retail_price) : "0"
  );

  // Derive initial discount percentage if editing
  const initialDiscountPct = useMemo(() => {
    if (!initialProduct) return "0";
    if (initialProduct.retail_price > 0 && initialProduct.discount > 0) {
      return ((initialProduct.discount / initialProduct.retail_price) * 100).toFixed(1);
    }
    return "0";
  }, [initialProduct]);

  const [discountPercent, setDiscountPercent] = useState<string>(initialDiscountPct);

  const supplierSelectOptions: SelectOption[] = useMemo(() => {
    return suppliers.map((s) => ({
      value: String(s.id),
      label: s.name,
      sublabel: s.phone ? `Phone: ${s.phone}` : undefined,
    }));
  }, [suppliers]);

  // Manual Inline Errors State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-calculated Unit Cost Price: Retail Price - (Retail Price * Discount %)
  const calculatedCost = useMemo(() => {
    const rp = parseFloat(retailPrice) || 0;
    const discPct = parseFloat(discountPercent) || 0;
    if (rp <= 0) return "0.00";
    const discountAmt = (rp * discPct) / 100;
    const cost = Math.max(0, rp - discountAmt);
    return cost.toFixed(2);
  }, [retailPrice, discountPercent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const nameErr = validateName(name, "Product name");
    if (nameErr) {
      setFormError(nameErr);
      focusFirstInvalidInput();
      return;
    }

    const typeToSave = selectedTypeSelect === "Other" ? customType : selectedTypeSelect;
    const typeErr = validateRequiredText(typeToSave, "Product type", 2);
    if (typeErr) {
      setFormError(typeErr);
      focusFirstInvalidInput();
      return;
    }

    const sizeErr = validateRequiredText(size, "Product size", 1);
    if (sizeErr) {
      setFormError(sizeErr);
      focusFirstInvalidInput();
      return;
    }

    const suppErr = validateDropdown(supplierId, "Supplier");
    if (suppErr) {
      setFormError(suppErr);
      focusFirstInvalidInput();
      return;
    }

    const qtyErr = validateNumeric(quantity, "Initial stock quantity", { min: 0, integerOnly: true });
    if (qtyErr) {
      setFormError(qtyErr);
      focusFirstInvalidInput();
      return;
    }

    const rpErr = validateNumeric(retailPrice, "Retail price", { min: 0 });
    if (rpErr) {
      setFormError(rpErr);
      focusFirstInvalidInput();
      return;
    }

    const discErr = validatePercentage(discountPercent, "Discount percentage", false);
    if (discErr) {
      setFormError(discErr);
      focusFirstInvalidInput();
      return;
    }

    const numQty = parseInt(quantity, 10);
    const numRp = parseFloat(retailPrice);
    const numDiscPct = parseFloat(discountPercent) || 0;
    const numDiscount = (numRp * numDiscPct) / 100;
    const numCost = Math.max(0, numRp - numDiscount);

    startTransition(async () => {
      if (isEditMode && initialProduct) {
        const res = await updateProductAction({
          id: initialProduct.id,
          name,
          type: typeToSave,
          size,
          supplier_id: parseInt(supplierId, 10),
          quantity: numQty,
          retail_price: numRp,
          discount: numDiscount,
          description,
          status: status as any,
        });

        if (res.success) {
          router.push("/products");
          router.refresh();
        } else {
          setFormError(res.message || "Failed to update product.");
          if (res.errors) setFieldErrors(res.errors);
        }
      } else {
        const res = await createProductAction({
          name,
          type: typeToSave,
          size,
          supplier_id: parseInt(supplierId, 10),
          quantity: numQty,
          retail_price: numRp,
          discount: numDiscount,
          description,
          status: status as any,
        });

        if (res.success) {
          router.push("/products");
          router.refresh();
        } else {
          setFormError(res.message || "Failed to create product.");
          if (res.errors) setFieldErrors(res.errors);
        }
      }
    });
  };

  return (
    <div className="px-8 py-4">
      {/* Title Header */}
      <PageHeader
        title={isEditMode ? `${t("common.edit")} ${t("nav.product")}` : t("buttons.add_product")}
        subtitle={
          isEditMode
            ? `Update details, pricing & status for Product #${initialProduct?.id}`
            : "Enter initial product inventory, retail price, discount percentage & status"
        }
        icon={<Package className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/products")}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            {t("common.back")}
          </Button>
        }
      />

      <Toast message={formError} type="error" onClose={() => setFormError(null)} duration={4000} />

      {/* Product Form Card */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-xs space-y-3.5" style={{ border: `1px solid ${theme.colors.cardBorder}` }} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* FIELD 1: Product Name */}
          <Input
            label="Product Name *"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: [] }));
            }}
            placeholder="Product name (e.g. Royal Ceiling Fan)"
            disabled={isPending}
            error={fieldErrors.name?.[0]}
            leftIcon={<Tag className="w-3.5 h-3.5" style={{ color: theme.colors.textMuted }} />}
            sizeVariant="sm"
          />

          {/* FIELD 2: Product Type Select Dropdown */}
          <Select
            label="Product Type *"
            value={selectedTypeSelect}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedTypeSelect(val);
              if (fieldErrors.type) setFieldErrors((prev) => ({ ...prev, type: [] }));
            }}
            disabled={isPending}
            error={fieldErrors.type?.[0]}
            sizeVariant="sm"
          >
            {STANDARD_PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="Other">Other (Define Custom Type)</option>
          </Select>

          {/* FIELD 3: Custom Type */}
          {selectedTypeSelect === "Other" && (
            <Input
              label="Define Custom Type *"
              type="text"
              value={customType}
              onChange={(e) => {
                setCustomType(e.target.value);
                if (fieldErrors.type) setFieldErrors((prev) => ({ ...prev, type: [] }));
              }}
              placeholder="Specify type (e.g. Solar Fan)"
              disabled={isPending}
              error={fieldErrors.type?.[0]}
              leftIcon={<Edit3 className="w-3.5 h-3.5" style={{ color: theme.colors.textMuted }} />}
              sizeVariant="sm"
            />
          )}

          {/* FIELD 4: Size */}
          <Input
            label="Size *"
            type="text"
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
              if (fieldErrors.size) setFieldErrors((prev) => ({ ...prev, size: [] }));
            }}
            placeholder="e.g. 56 inch"
            disabled={isPending}
            error={fieldErrors.size?.[0]}
            leftIcon={<Ruler className="w-3.5 h-3.5" style={{ color: theme.colors.textMuted }} />}
            sizeVariant="sm"
          />

          {/* FIELD 5: Supplier Selection */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: theme.colors.textSecondary }}>
              Supplier <span style={{ color: theme.colors.errorText }}>*</span>
            </label>
            <SearchableSelect
              options={supplierSelectOptions}
              value={supplierId}
              onChange={(val) => {
                setSupplierId(val);
                if (fieldErrors.supplier_id)
                  setFieldErrors((prev) => ({ ...prev, supplier_id: [] }));
              }}
              placeholder="Search supplier..."
              disabled={isPending}
            />
            {fieldErrors.supplier_id?.[0] && (
              <p className="mt-0.5 text-[10px] font-medium flex items-center gap-1" style={{ color: theme.colors.errorText }}>
                <AlertCircle className="w-3 h-3" />
                <span>{fieldErrors.supplier_id[0]}</span>
              </p>
            )}
          </div>

          {/* FIELD 6: Initial Quantity (Default = 1) */}
          <Input
            label="Initial Available Stock Qty *"
            type="text"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              if (fieldErrors.quantity)
                setFieldErrors((prev) => ({ ...prev, quantity: [] }));
            }}
            placeholder="1"
            disabled={isPending}
            error={fieldErrors.quantity?.[0]}
            leftIcon={<Hash className="w-3.5 h-3.5" style={{ color: theme.colors.textMuted }} />}
            sizeVariant="sm"
          />

          {/* FIELD 7: Retail Price (Rs.) */}
          <Input
            label="Retail Price (RP) (Rs.) *"
            type="text"
            value={retailPrice}
            onChange={(e) => {
              setRetailPrice(e.target.value);
              if (fieldErrors.retail_price)
                setFieldErrors((prev) => ({ ...prev, retail_price: [] }));
            }}
            placeholder="0.00"
            disabled={isPending}
            error={fieldErrors.retail_price?.[0]}
            sizeVariant="sm"
          />

          {/* FIELD 8: Discount Percentage (%) */}
          <Input
            label="Distributor Discount (%) *"
            type="text"
            value={discountPercent}
            onChange={(e) => {
              setDiscountPercent(e.target.value);
              if (fieldErrors.discount)
                setFieldErrors((prev) => ({ ...prev, discount: [] }));
            }}
            placeholder="e.g. 15"
            disabled={isPending}
            error={fieldErrors.discount?.[0]}
            rightIcon={<Percent className="w-3.5 h-3.5" style={{ color: theme.colors.textMuted }} />}
            sizeVariant="sm"
          />

          {/* FIELD 9: Status (Active / Inactive) */}
          <Select
            label="Status *"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={isPending}
            sizeVariant="sm"
          >
            <option value="active">Active (Available)</option>
            <option value="inactive">Inactive (Disabled / Soft Deleted)</option>
          </Select>

          {/* FIELD 10: Description */}
          <div className="md:col-span-2 lg:col-span-3">
            <Input
              label="Description (Optional)"
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: [] }));
              }}
              placeholder="Product description, winding details, warranty..."
              disabled={isPending}
              leftIcon={<FileText className="w-3.5 h-3.5" style={{ color: theme.colors.textMuted }} />}
              sizeVariant="sm"
            />
          </div>
        </div>

        {/* Compact Auto-Calculated Cost Price Strip */}
        <div className="rounded-lg px-3.5 py-2 flex items-center justify-between" style={{ backgroundColor: `${theme.colors.brandBg}4D`, border: `1px solid ${theme.colors.primary}33` }}>
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: theme.colors.primary }}>
            <Calculator className="w-4 h-4 shrink-0" style={{ color: theme.colors.primary }} />
            <span>Auto-Calculated Unit Cost Price:</span>
            <span className="text-[11px] font-normal hidden sm:inline" style={{ color: theme.colors.textSecondary }}>(Retail Price - Approved Discount %)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color: theme.colors.primary }}>Rs.</span>
            <input
              type="text"
              readOnly
              value={calculatedCost}
              className="w-28 bg-white rounded-md px-2.5 py-1 text-xs font-bold text-right focus:outline-none shadow-2xs"
              style={{ border: `1px solid ${theme.colors.cardBorder}`, color: theme.colors.primary }}
            />
          </div>
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t" style={{ borderColor: theme.colors.cardBorder }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push("/products")}
            disabled={isPending}
          >
            {t("common.cancel")}
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
            {isPending ? t("common.loading") : isEditMode ? t("common.update") : t("common.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
