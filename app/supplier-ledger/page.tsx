import { authService } from "@/lib/services/auth.service";
import { supplierService } from "@/lib/services/supplier.service";
import { supplierLedgerService } from "@/lib/services/supplier_ledger.service";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import SupplierLedgerManager from "./SupplierLedgerManager";
import { SupplierLedgerEntry } from "@/lib/types/supplier_ledger";
import theme from "@/theme";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export const metadata = {
  title: "Supplier Ledger | Inventory Management",
  description: "Manage accounts payable, supplier statements, and purchase ledger transactions",
};

export const revalidate = 0;

export default async function SupplierLedgerPage({
  searchParams,
}: {
  searchParams?: Promise<{ supplierId?: string }>;
}) {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const supplierIdFromQuery = resolvedParams?.supplierId ? parseInt(resolvedParams.supplierId) : undefined;

  const suppliers = await supplierService.getSuppliers();

  // Load initial ledger for the selected supplier if available
  const initialLedgers: Record<number, SupplierLedgerEntry[]> = {};
  const targetSupplierId = supplierIdFromQuery && suppliers.some((s) => s.id === supplierIdFromQuery)
    ? supplierIdFromQuery
    : (suppliers.length > 0 ? suppliers[0].id : 0);

  if (targetSupplierId > 0) {
    initialLedgers[targetSupplierId] = await supplierLedgerService.getSupplierLedger(
      targetSupplierId,
      getDefaultStartDate(60),
      getDefaultEndDate()
    );
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="print:hidden">
        <Navbar activePageTitle="Supplier Ledger" />
      </div>
      <main className="flex-1 min-h-0 overflow-hidden">
        <SupplierLedgerManager
          suppliers={suppliers}
          initialLedgers={initialLedgers}
          initialSupplierId={targetSupplierId}
        />
      </main>
    </div>
  );
}
