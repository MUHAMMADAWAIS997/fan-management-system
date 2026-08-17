import { authService } from "@/lib/services/auth.service";
import { expenseService } from "@/lib/services/expense.service";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import ExpenseManager from "./ExpenseManager";
import theme from "@/theme";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export const metadata = {
  title: "Business Expenses | Inventory Management",
  description: "Track automatic stock purchase expenses & manual operational costs",
};

export const revalidate = 0;

export default async function ExpensesPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const expenses = await expenseService.getExpenses(getDefaultStartDate(60), getDefaultEndDate());

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="print:hidden">
        <Navbar activePageTitle="Business Expenses" />
      </div>
      <main className="flex-1 min-h-0 overflow-hidden">
        <ExpenseManager initialExpenses={expenses} />
      </main>
    </div>
  );
}
