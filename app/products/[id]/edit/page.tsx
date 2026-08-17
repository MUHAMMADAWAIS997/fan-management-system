import { authService } from "@/lib/services/auth.service";
import { productService } from "@/lib/services/product.service";
import { supplierService } from "@/lib/services/supplier.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import ProductForm from "../../ProductForm";

export const revalidate = 0;

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  const productId = Number(id);

  if (isNaN(productId) || productId <= 0) {
    redirect("/products");
  }

  const [product, suppliers] = await Promise.all([
    productService.getProductById(productId),
    supplierService.getSuppliers(),
  ]);

  if (!product) {
    redirect("/products");
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Products" />
      <main className="flex-1">
        <ProductForm initialProduct={product} suppliers={suppliers} />
      </main>
    </div>
  );
}
