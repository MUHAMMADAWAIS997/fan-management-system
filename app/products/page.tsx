import { authService } from "@/lib/services/auth.service";
import { productService } from "@/lib/services/product.service";
import { supplierService } from "@/lib/services/supplier.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import ProductManager from "./ProductManager";

export const revalidate = 0;

export default async function ProductsPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const [products, suppliers] = await Promise.all([
    productService.getProducts(),
    supplierService.getSuppliers(),
  ]);

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      <Navbar activePageTitle="Products" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <ProductManager initialProducts={products} suppliers={suppliers} />
      </main>
    </div>
  );
}
