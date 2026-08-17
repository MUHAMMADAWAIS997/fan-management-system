import { redirect } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { productService } from "@/lib/services/product.service";
import { supplierService } from "@/lib/services/supplier.service";
import theme from "@/theme";
import StockForm from "../StockForm";
import Navbar from "@/app/components/Navbar";

export const revalidate = 0;

export const metadata = {
  title: "Receive Stock Batch - Inventory Management",
};

export default async function AddReceiveStockPage() {
  const user = await authService.getCurrentSessionUser();
  if (!user) {
    redirect("/");
  }

  const products = await productService.getActiveProducts();
  const suppliers = await supplierService.getSuppliers();

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Receive Stock" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <StockForm products={products} companies={suppliers} />
      </main>
    </div>
  );
}
