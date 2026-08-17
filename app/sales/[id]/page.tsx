import { authService } from "@/lib/services/auth.service";
import { printerService } from "@/lib/services/printer.service";
import { invoiceSettingsService } from "@/lib/services/invoice_settings.service";
import { redirect, notFound } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import SaleInvoiceView from "./SaleInvoiceView";
import { getSaleByIdAction } from "@/app/actions/sale";

export const revalidate = 0;

interface SaleDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;
  const saleId = parseInt(id);

  if (isNaN(saleId)) {
    notFound();
  }

  const sale = await getSaleByIdAction(saleId);

  if (!sale) {
    notFound();
  }

  const printerConfig = printerService.getPrinterConfig();
  const invoiceSettings = invoiceSettingsService.getInvoiceSettings();

  return (
    <div
      className="h-screen max-h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle={`Sale Invoice #${sale.invoice_number}`} />
      <main className="flex-1 min-h-0 overflow-hidden">
        <SaleInvoiceView
          sale={sale}
          printerConfig={printerConfig}
          invoiceSettings={invoiceSettings}
        />
      </main>
    </div>
  );
}
