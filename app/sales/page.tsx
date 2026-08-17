import { authService } from "@/lib/services/auth.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import SalesManager from "./SalesManager";
import { getAllSalesAction } from "@/app/actions/sale";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export const revalidate = 0;

export default async function SalesPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const sales = await getAllSalesAction(getDefaultStartDate(60), getDefaultEndDate());

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Sale Records" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <SalesManager initialSales={sales} />
      </main>
    </div>
  );
}
