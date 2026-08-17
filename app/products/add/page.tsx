import { authService } from "@/lib/services/auth.service";
import { supplierService } from "@/lib/services/supplier.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import ProductForm from "../ProductForm";

export const revalidate = 0;

export default async function AddProductPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const suppliers = await supplierService.getSuppliers();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Products" />
      <main className="flex-1">
        <ProductForm suppliers={suppliers} />
      </main>
    </div>
  );
}
