import { authService } from "@/lib/services/auth.service";
import { supplierService } from "@/lib/services/supplier.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import SupplierManager from "./SupplierManager";

export const revalidate = 0;

export default async function SuppliersPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const suppliers = await supplierService.getSuppliers();

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Supplier" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <SupplierManager initialSuppliers={suppliers} />
      </main>
    </div>
  );
}
