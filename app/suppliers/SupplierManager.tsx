"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Toast from "@/app/components/Toast";
import { Supplier } from "@/lib/types/supplier";
import { useI18n } from "@/lib/i18n-context";
import {
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
} from "@/app/actions/supplier";
import theme from "@/theme";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Phone,
  User,
  AlertCircle,
  BookOpen,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  validateName,
  validatePhone,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import { Button, Input, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableContainer, PageHeader, FilterBar } from "@/ui";

interface SupplierManagerProps {
  initialSuppliers: Supplier[];
}

export default function SupplierManager({ initialSuppliers }: SupplierManagerProps) {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Pagination State (7 entries per page)
  const ITEMS_PER_PAGE = 7;
  const [currentPage, setCurrentPage] = useState(1);

  // Filter suppliers by search term
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm)
  );

  // Total pages based on filtered suppliers
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE) || 1;

  // Paginated Slice (7 entries per page)
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const openAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setPhone("");
    setFieldErrors({});
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setPhone(supplier.phone);
    setFieldErrors({});
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string[]> = {};

    const nameErr = validateName(name, "Supplier name", 2);
    if (nameErr) errors.name = [nameErr];

    const phoneErr = validatePhone(phone, "Phone number", true);
    if (phoneErr) errors.phone = [phoneErr];

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError("Please correct the highlighted errors before submitting.");
      focusFirstInvalidInput();
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      if (editingSupplier) {
        // Update Supplier
        const res = await updateSupplierAction({
          id: editingSupplier.id,
          name,
          phone,
        });

        if (res.success && res.data) {
          const updated = res.data;
          setSuppliers((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
          closeModal();
        } else {
          setFormError(res.message || "Failed to update supplier.");
          if (res.errors) setFieldErrors(res.errors);
        }
      } else {
        // Create Supplier
        const res = await createSupplierAction({ name, phone });

        if (res.success && res.data) {
          setSuppliers((prev) => [res.data!, ...prev]);
          closeModal();
        } else {
          setFormError(res.message || "Failed to add supplier.");
          if (res.errors) setFieldErrors(res.errors);
        }
      }
    });
  };

  const handleDelete = () => {
    if (!deletingSupplier) return;

    startTransition(async () => {
      const res = await deleteSupplierAction(deletingSupplier.id);
      if (res.success) {
        setSuppliers((prev) => prev.filter((s) => s.id !== deletingSupplier.id));
        setDeletingSupplier(null);
      } else {
        alert(res.message || "Failed to delete supplier.");
      }
    });
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full">
      {/* Top Header & Actions */}
      <PageHeader
        title={t("headers.suppliers")}
        icon={<Building2 className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            {t("buttons.add_supplier")}
          </Button>
        }
      />

      {/* Search Input */}
      <FilterBar>
        <div className="max-w-md">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by supplier name or phone number..."
            leftIcon={<Search className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />
        </div>
      </FilterBar>

      {/* Suppliers Table Container */}
      <TableContainer cardWrapper>
        <div className="flex-1 overflow-y-auto min-h-0">
          {paginatedSuppliers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Building2 className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
              <p>{searchTerm ? "No matching suppliers found." : "No suppliers registered yet."}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{t("table.supplier_name")}</TableHead>
                  <TableHead>{t("common.phone")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono font-medium text-slate-400 text-xs">
                      #{supplier.id}
                    </TableCell>
                    <TableCell className="font-bold" style={{ color: theme.colors.onSurface }}>
                      {supplier.name}
                    </TableCell>
                    <TableCell style={{ color: theme.colors.onSurfaceVariant }}>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{supplier.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px]" style={{ color: theme.colors.onSurfaceVariant }}>
                      {supplier.created_at
                        ? supplier.created_at.split("T")[0].split(" ")[0]
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Link
                          href={`/supplier-ledger?supplierId=${supplier.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer hover:bg-[#eceef0]"
                          style={{ color: theme.colors.primary }}
                          title="View Supplier Ledger"
                        >
                          <BookOpen className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                          <span>{t("buttons.view_ledger")}</span>
                        </Link>
                        <Link
                          href={`/receive-stock?supplierId=${supplier.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors cursor-pointer hover:bg-[#eceef0]"
                          style={{ color: theme.colors.primary }}
                          title="View Batch Receive History"
                        >
                          <History className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                          <span>Batch History</span>
                        </Link>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openEditModal(supplier)}
                          title="Edit Supplier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => setDeletingSupplier(supplier)}
                          title="Delete Supplier"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
              {filteredSuppliers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredSuppliers.length)}
            </span>{" "}
            of <span className="font-bold" style={{ color: theme.colors.onSurface }}>{filteredSuppliers.length}</span> suppliers
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

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
        icon={editingSupplier ? <Pencil className="w-4 h-4" style={{ color: theme.colors.primary }} /> : <Plus className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        maxWidth="sm"
      >
        <Toast message={formError} type="error" onClose={() => setFormError(null)} duration={4000} />

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <Input
            label="Supplier Name *"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: [] }));
            }}
            placeholder="Company / Contact Name"
            disabled={isPending}
            error={fieldErrors.name?.[0]}
            leftIcon={<User className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />

          <Input
            label="Phone Number *"
            type="text"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: [] }));
            }}
            placeholder="Phone number"
            disabled={isPending}
            error={fieldErrors.phone?.[0]}
            leftIcon={<Phone className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />

          <div className="flex items-center justify-end space-x-2 pt-3 border-t" style={{ borderColor: theme.colors.cardBorder }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={closeModal}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isPending}
            >
              {editingSupplier ? "Update Supplier" : "Save Supplier"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Supplier Modal */}
      <Modal
        isOpen={Boolean(deletingSupplier)}
        onClose={() => setDeletingSupplier(null)}
        title="Delete Supplier?"
        icon={<Trash2 className="w-4 h-4 text-rose-600" />}
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeletingSupplier(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={isPending}
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <p className="text-xs" style={{ color: theme.colors.onSurfaceVariant }}>
          Are you sure you want to delete <strong>{deletingSupplier?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
}
