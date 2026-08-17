import { authService } from "@/lib/services/auth.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import CustomerLedgerManager from "./CustomerLedgerManager";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { getCustomerLedgerAction } from "@/app/actions/customer_ledger";

import { getDefaultStartDate, getDefaultEndDate } from "@/lib/utils/date";

export const revalidate = 0;

interface CustomerLedgerPageProps {
  searchParams: Promise<{ customerId?: string }>;
}

export default async function CustomerLedgerPage({ searchParams }: CustomerLedgerPageProps) {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const { customerId } = await searchParams;
  const customers = customerRepository.getAll();

  const parsedId = customerId ? parseInt(customerId, 10) : undefined;
  const initialCustomerId =
    parsedId && customers.some((c) => c.id === parsedId)
      ? parsedId
      : customers.length > 0
      ? customers[0].id
      : undefined;

  const initialLedger = initialCustomerId
    ? await getCustomerLedgerAction(initialCustomerId, getDefaultStartDate(60), getDefaultEndDate())
    : [];

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Customer Ledger" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <CustomerLedgerManager
          customers={customers}
          initialCustomerId={initialCustomerId}
          initialLedger={initialLedger}
        />
      </main>
    </div>
  );
}
