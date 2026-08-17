import { authService } from "@/lib/services/auth.service";
import { stockService } from "@/lib/services/stock.service";
import { supplierService } from "@/lib/services/supplier.service";
import { productService } from "@/lib/services/product.service";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import AvailableStockManager from "./AvailableStockManager";
import theme from "@/theme";

export const metadata = {
  title: "Available Stock & Profit Analysis - Inventory Management",
};

export const revalidate = 0;

export default async function AvailableStockPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const stockRecords = await stockService.getAvailableStockRecords();
  const suppliers = await supplierService.getSuppliers();
  const products = await productService.getActiveProducts();

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="print:hidden">
        <Navbar activePageTitle="Available Stock" />
      </div>
      <main className="flex-1 min-h-0 overflow-hidden">
        <AvailableStockManager
          initialRecords={stockRecords}
          suppliers={suppliers}
          products={products}
        />
      </main>
    </div>
  );
}
