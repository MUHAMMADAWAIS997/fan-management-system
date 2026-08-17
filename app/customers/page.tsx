import { authService } from "@/lib/services/auth.service";
import { customerService } from "@/lib/services/customer.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import CustomerManager from "./CustomerManager";

export const revalidate = 0;

export default async function CustomersPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const customers = await customerService.getCustomers();

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Customers" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <CustomerManager initialCustomers={customers} />
      </main>
    </div>
  );
}
