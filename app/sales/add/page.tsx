import { authService } from "@/lib/services/auth.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import AddSaleForm from "./AddSaleForm";
import { productRepository } from "@/lib/repositories/product.repository";
import { customerRepository } from "@/lib/repositories/customer.repository";

export const revalidate = 0;

export default async function AddSalePage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const products = productRepository.getActiveOnly();
  const customers = customerRepository.getAll();

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Record New Sale" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <AddSaleForm products={products} customers={customers} />
      </main>
    </div>
  );
}
