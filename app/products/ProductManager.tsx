"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Product } from "@/lib/types/product";
import { Supplier } from "@/lib/types/supplier";
import { toggleProductStatusAction } from "@/app/actions/product";
import { useI18n } from "@/lib/i18n-context";
import {
  Package,
  Plus,
  Pencil,
  History,
  Search,
  Building2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
} from "lucide-react";
import theme from "@/theme";
import { Button, Input, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableContainer, PageHeader, FilterBar, Badge } from "@/ui";

interface ProductManagerProps {
  initialProducts: Product[];
  suppliers: Supplier[];
}

export default function ProductManager({
  initialProducts,
  suppliers,
}: ProductManagerProps) {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Pagination State (6 entries per page)
  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // Extract unique Product Types and Sizes for filter dropdowns
  const availableTypes = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.type).filter(Boolean))).sort();
  }, [products]);

  const availableSizes = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.size).filter(Boolean))).sort();
  }, [products]);

  // Sort products in Ascending Order by ID (1, 2, 3...) & filter by Search, Type, and Size
  const filteredProducts = useMemo(() => {
    const sortedAsc = [...products].sort((a, b) => a.id - b.id);

    return sortedAsc.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.type.toLowerCase().includes(q) ||
        p.size.toLowerCase().includes(q) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(q)) ||
        (p.status && p.status.toLowerCase().includes(q));

      const matchesType = !selectedType || p.type === selectedType;
      const matchesSize = !selectedSize || p.size === selectedSize;

      return matchesSearch && matchesType && matchesSize;
    });
  }, [products, searchTerm, selectedType, selectedSize]);

  // Total pages based on filtered products
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;

  // Paginated Slice (6 entries per page)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedType("");
    setSelectedSize("");
    setCurrentPage(1);
  };

  const handleToggleStatus = (product: Product) => {
    const nextStatus = product.status === "inactive" ? "active" : "inactive";
    startTransition(async () => {
      const res = await toggleProductStatusAction(product.id, nextStatus);
      if (res.success && res.data) {
        const updated = res.data;
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      } else {
        alert(res.message || "Failed to update product status.");
      }
    });
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full">
      {/* No Suppliers Warning */}
      {suppliers.length === 0 && (
        <div className="rounded-md p-2.5 mb-2 flex items-center justify-between shrink-0" style={{ backgroundColor: theme.colors.errorBg, borderColor: theme.colors.errorBorder }}>
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: theme.colors.onErrorContainer }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: theme.colors.errorText }} />
            <span>No suppliers found. You must register at least one supplier before adding products.</span>
          </div>
          <Link
            href="/suppliers"
            className="px-2.5 py-1 text-xs font-semibold bg-white rounded-md transition-colors" style={{ color: theme.colors.onSurface }}
          >
            {t("buttons.add_supplier")}
          </Link>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title={t("headers.products")}
        icon={<Package className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <Link href="/products/add">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {t("buttons.add_product")}
            </Button>
          </Link>
        }
      />

      {/* Filter / Search Bar */}
      <FilterBar className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="min-w-[200px] flex-1">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by product name, type, size, or supplier..."
              leftIcon={<Search className="w-3.5 h-3.5" />}
              sizeVariant="sm"
            />
          </div>

          {/* Type Filter */}
          <div className="w-40">
            <Select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              sizeVariant="sm"
            >
              <option value="">All Types ({availableTypes.length})</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          {/* Size Filter */}
          <div className="w-36">
            <Select
              value={selectedSize}
              onChange={(e) => {
                setSelectedSize(e.target.value);
                setCurrentPage(1);
              }}
              sizeVariant="sm"
            >
              <option value="">All Sizes ({availableSizes.length})</option>
              {availableSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Reset Filter Button */}
        {(searchTerm || selectedType || selectedSize) && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Filters
          </Button>
        )}
      </FilterBar>

      {/* Products Table Container */}
      <TableContainer cardWrapper>
        <div className="flex-1 overflow-y-auto min-h-0">
          {paginatedProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Package className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
              <p className="text-xs font-medium">
                {searchTerm ? "No matching products found." : "No products added yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t("table.product_name")}</TableHead>
                  <TableHead>{t("common.type")}</TableHead>
                  <TableHead>{t("common.size")}</TableHead>
                  <TableHead>{t("table.supplier_name")}</TableHead>
                  <TableHead className="text-center">{t("common.quantity")}</TableHead>
                  <TableHead className="text-center">{t("table.status")}</TableHead>
                  <TableHead className="text-right">{t("table.retail_price")}</TableHead>
                  <TableHead className="text-right">{t("common.discount")}</TableHead>
                  <TableHead className="text-right font-bold" style={{ color: theme.colors.onSurface }}>{t("table.cost_price")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className={product.status === "inactive" ? "bg-slate-50/40 opacity-75" : ""}
                  >
                    <TableCell className="font-mono font-medium text-slate-400 text-xs">
                      #{product.id}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold" style={{ color: theme.colors.onSurface }}>{product.name}</div>
                      {product.description && (
                        <div className="text-[11px] font-normal mt-0.5 line-clamp-1" style={{ color: theme.colors.onSurfaceVariant }}>
                          {product.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell style={{ color: theme.colors.onSurfaceVariant }}>
                      <Badge variant="secondary" size="xs">
                        {product.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs" style={{ color: theme.colors.onSurfaceVariant }}>
                      {product.size}
                    </TableCell>
                    <TableCell style={{ color: theme.colors.onSurfaceVariant }}>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{product.supplier_name || `ID: ${product.supplier_id}`}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          product.quantity > 5
                            ? "success"
                            : product.quantity > 0
                            ? "warning"
                            : "danger"
                        }
                        size="xs"
                      >
                        {product.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant={product.status === "inactive" ? "danger" : "ghost"}
                        size="xs"
                        onClick={() => handleToggleStatus(product)}
                        disabled={isPending}
                        title={`Click to toggle status to ${product.status === "inactive" ? "Active" : "Inactive"}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${product.status === "inactive" ? "bg-rose-500" : "bg-emerald-500"}`} />
                        <span>{product.status === "inactive" ? "Inactive" : "Active"}</span>
                      </Button>
                    </TableCell>
                    <TableCell className="text-right font-medium" style={{ color: theme.colors.onSurface }}>
                      Rs. {product.retail_price.toLocaleString("en-PK")}
                    </TableCell>
                    <TableCell className="text-right text-amber-700 font-medium">
                      Rs. {product.discount.toLocaleString("en-PK")}
                    </TableCell>
                    <TableCell className="text-right font-bold" style={{ color: theme.colors.primary }}>
                      Rs. {product.cost.toLocaleString("en-PK")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Link
                          href={`/products/${product.id}/history`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer hover:bg-[#eceef0]"
                          style={{ color: theme.colors.primary }}
                          title="View Product Transaction History (IN / OUT)"
                        >
                          <History className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                          <span>History</span>
                        </Link>
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="p-1 rounded transition-colors cursor-pointer hover:bg-[#eceef0]"
                          style={{ color: theme.colors.onSurfaceVariant }}
                          title="Edit Product"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Screen Pagination Controls */}
        <div className="p-2 border-t flex items-center justify-between text-xs shrink-0" style={{ backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.surfaceContainerHighest, color: theme.colors.onSurfaceVariant }}>
          <div>
            Showing{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {filteredProducts.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}
            </span>{" "}
            of <span className="font-bold" style={{ color: theme.colors.onSurface }}>{filteredProducts.length}</span> products
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
    </div>
  );
}
