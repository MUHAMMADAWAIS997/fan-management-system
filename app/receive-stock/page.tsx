import { redirect } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { stockService } from "@/lib/services/stock.service";
import StockManager from "./StockManager";
import Navbar from "@/app/components/Navbar";
import theme from "@/theme";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export const metadata = {
  title: "Receive Stock - Inventory & Purchase Management",
};

export default async function ReceiveStockPage() {
  const user = await authService.getCurrentSessionUser();
  if (!user) {
    redirect("/");
  }

  const batches = await stockService.getStockBatches(getDefaultStartDate(60), getDefaultEndDate());

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Receive Stock" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <StockManager initialBatches={batches} />
      </main>
    </div>
  );
}
