import { authService } from "@/lib/services/auth.service";
import { backupService } from "@/lib/services/backup.service";
import { printerService } from "@/lib/services/printer.service";
import { invoiceSettingsService } from "@/lib/services/invoice_settings.service";
import { recoveryService } from "@/lib/services/recovery.service";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import SettingsManager from "./SettingsManager";

export const revalidate = 0;

export default async function SettingsPage() {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const initialBackups = backupService.listBackups();
  const initialPrinters = printerService.getAttachedPrinters();
  const initialPrinterConfig = printerService.getPrinterConfig();
  const initialInvoiceSettings = invoiceSettingsService.getInvoiceSettings();
  const backupDirPath = backupService.getBackupDir();
  const isDirConfigured = backupService.isBackupDirConfigured();
  const masterCode = recoveryService.getMasterCode();

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      <div className="print:hidden">
        <Navbar activePageTitle="Settings" />
      </div>
      <main className="flex-1 min-h-0 overflow-y-auto">
        <SettingsManager
          initialBackups={initialBackups}
          initialPrinters={initialPrinters}
          initialPrinterConfig={initialPrinterConfig}
          initialInvoiceSettings={initialInvoiceSettings}
          backupDirPath={backupDirPath}
          isDirConfigured={isDirConfigured}
          masterCode={masterCode}
        />
      </main>
    </div>
  );
}
