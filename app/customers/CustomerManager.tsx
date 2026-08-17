"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import Toast from "@/app/components/Toast";
import { Customer } from "@/lib/types/customer";
import { useI18n } from "@/lib/i18n-context";
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
} from "@/app/actions/customer";
import { getCustomerLedgerAction } from "@/app/actions/customer_ledger";
import theme from "@/theme";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Phone,
  MapPin,
  User,
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  validateName,
  validatePhone,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import { Button, Input, Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableContainer, PageHeader, FilterBar } from "@/ui";

interface CustomerManagerProps {
  initialCustomers: Customer[];
}

export default function CustomerManager({ initialCustomers }: CustomerManagerProps) {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPending, startTransition] = useTransition();

  // Pagination State (7 entries per page)
  const ITEMS_PER_PAGE = 7;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page to 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filter customers by search term
  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  // Total pages based on filtered customers
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;

  // Paginated Slice (7 entries per page)
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setLocation("");
    setFieldErrors({});
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setLocation(customer.location || "");
    setFieldErrors({});
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string[]> = {};

    const nameErr = validateName(name, "Customer name", 2);
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
      if (editingCustomer) {
        // Update Customer
        const res = await updateCustomerAction({
          id: editingCustomer.id,
          name,
          phone,
          location,
        });

        if (res.success && res.data) {
          const updated = res.data;
          setCustomers((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
          closeModal();
        } else {
          setFormError(res.message || "Failed to update customer.");
          if (res.errors) setFieldErrors(res.errors);
        }
      } else {
        // Create Customer
        const res = await createCustomerAction({ name, phone, location });

        if (res.success && res.data) {
          setCustomers((prev) => [res.data!, ...prev]);
          closeModal();
        } else {
          setFormError(res.message || "Failed to add customer.");
          if (res.errors) setFieldErrors(res.errors);
        }
      }
    });
  };

  const handleDelete = () => {
    if (!deletingCustomer) return;

    startTransition(async () => {
      // Check if customer has ledger entries
      const ledger = await getCustomerLedgerAction(deletingCustomer.id);
      if (ledger && ledger.length > 0) {
        setDeleteError("Customer has ledger entries and cannot be deleted.");
        return;
      }
      const res = await deleteCustomerAction(deletingCustomer.id);
      if (res.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
        setDeletingCustomer(null);
      } else {
        alert(res.message || "Failed to delete customer.");
      }
    });
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden max-w-full">
      {/* Top Header & Actions */}
      <PageHeader
        title={t("headers.customers")}
        icon={<Users className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            {t("buttons.add_customer")}
          </Button>
        }
      />

      {/* Search Bar */}
      <FilterBar>
        <div className="max-w-md">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, or location..."
            leftIcon={<Search className="w-3.5 h-3.5" />}
            sizeVariant="sm"
          />
        </div>
      </FilterBar>

      {/* Customers Table Container */}
      <TableContainer cardWrapper>
        <div className="flex-1 overflow-y-auto min-h-0">
          {paginatedCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Users className="w-7 h-7 mx-auto mb-2 text-slate-300 stroke-1" />
              <p>{searchTerm ? "No matching customers found." : "No customers registered yet."}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>{t("table.customer_name")}</TableHead>
                  <TableHead>{t("common.phone")}</TableHead>
                  <TableHead>{t("common.location")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead className="text-right">{t("table.actions")}</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-mono font-medium text-slate-400 text-xs">
                      #{customer.id}
                    </TableCell>
                    <TableCell className="font-bold" style={{ color: theme.colors.onSurface }}>
                      {customer.name}
                    </TableCell>
                    <TableCell style={{ color: theme.colors.onSurfaceVariant }}>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{customer.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell style={{ color: theme.colors.onSurfaceVariant }}>
                      {customer.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{customer.location}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#41484a] font-mono text-[11px]">
                      {customer.created_at ? customer.created_at.split("T")[0].split(" ")[0] : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Link
                          href={`/customer-ledger?customerId=${customer.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer hover:bg-[#eceef0]"
                          style={{ color: theme.colors.primary }}
                          title="View Customer Ledger"
                        >
                          <BookOpen className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                          <span>{t("buttons.view_ledger")}</span>
                        </Link>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openEditModal(customer)}
                          title="Edit Customer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="danger"
                          size="xs"
                          onClick={() => setDeletingCustomer(customer)}
                          title="Delete Customer"
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
              {filteredCustomers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold" style={{ color: theme.colors.onSurface }}>
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)}
            </span>{" "}
            of <span className="font-bold" style={{ color: theme.colors.onSurface }}>{filteredCustomers.length}</span> customers
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

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
        icon={editingCustomer ? <Pencil className="w-4 h-4" style={{ color: theme.colors.primary }} /> : <Plus className="w-4 h-4" style={{ color: theme.colors.primary }} />}
        maxWidth="sm"
      >
        <Toast message={formError} type="error" onClose={() => setFormError(null)} duration={4000} />

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <Input
            label="Customer Name *"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: [] }));
            }}
            placeholder="Full name"
            disabled={isPending}
            error={fieldErrors.name?.[0] ? "Customer name is required" : undefined}
            leftIcon={<User className="w-3.5 h-3.5" />}
            sizeVariant="sm"
            required
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
            error={fieldErrors.phone?.[0] ? "Phone number is required" : undefined}
            leftIcon={<Phone className="w-3.5 h-3.5" />}
            sizeVariant="sm"
            required
          />

          <Input
            label="Location (Optional)"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City / Address"
            disabled={isPending}
            leftIcon={<MapPin className="w-3.5 h-3.5" />}
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
              {editingCustomer ? "Update Customer" : "Save Customer"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        title="Delete Customer?"
        icon={<Trash2 className="w-4 h-4 text-rose-600" />}
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeletingCustomer(null)}
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
        <p className="text-xs mb-2" style={{ color: theme.colors.onSurfaceVariant }}>
          Are you sure you want to delete <strong>{deletingCustomer?.name}</strong>?
        </p>
        {deleteError && (
          <Toast message={deleteError} type="error" onClose={() => setDeleteError(null)} duration={4000} />
        )}
      </Modal>
    </div>
  );
}
