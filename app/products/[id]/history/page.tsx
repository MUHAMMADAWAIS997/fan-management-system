import { authService } from "@/lib/services/auth.service";
import { redirect, notFound } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import ProductHistoryView from "./ProductHistoryView";
import { getProductHistoryAction } from "@/app/actions/product";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export const revalidate = 0;

interface ProductHistoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductHistoryPage({ params }: ProductHistoryPageProps) {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  const productId = parseInt(id);

  if (isNaN(productId)) {
    notFound();
  }

  const historyData = await getProductHistoryAction(
    productId,
    getDefaultStartDate(60),
    getDefaultEndDate()
  );

  if (!historyData) {
    notFound();
  }

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle={`Product History: ${historyData.product.name}`} />
      <main className="flex-1 min-h-0 overflow-hidden">
        <ProductHistoryView historyData={historyData} />
      </main>
    </div>
  );
}
