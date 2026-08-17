import { redirect, notFound } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { stockService } from "@/lib/services/stock.service";
import BatchDetailView from "./BatchDetailView";
import Navbar from "@/app/components/Navbar";
import theme from "@/theme";

export const metadata = {
  title: "Stock Receipt Invoice Details",
};

interface BatchPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BatchPage({ params }: BatchPageProps) {
  const user = await authService.getCurrentSessionUser();
  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  const batchId = Number(id);

  if (isNaN(batchId) || batchId <= 0) {
    notFound();
  }

  const batch = await stockService.getBatchById(batchId);

  if (!batch) {
    notFound();
  }

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="print:hidden">
        <Navbar activePageTitle="Stock Receipt Invoice" />
      </div>
      <main className="flex-1 min-h-0 overflow-hidden">
        <BatchDetailView batch={batch} />
      </main>
    </div>
  );
}
