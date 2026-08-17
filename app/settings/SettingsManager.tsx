"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import Toast, { ToastType } from "@/app/components/Toast";
import { useI18n } from "@/lib/i18n-context";
import {
  validateRequiredText,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import {
  KeyRound,
  Database,
  Printer,
  Save,
  HardDrive,
  Building2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  FolderPlus,
  PrinterCheck,
  Edit2,
  X,
  Lock,
  RotateCcw,
  ShieldCheck,
  Copy,
  Check,
  Download,
  FileText,
  Phone,
  RefreshCw,
  Receipt,
  Terminal,
  CircleAlert,
  Settings,
} from "lucide-react";
import {
  Button,
  Input,
  Select,
  Modal,
  PageHeader,
  Card,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableContainer,
  Watermark,
} from "@/ui";
import {
  updatePasswordAction,
  createBackupAction,
  restoreBackupAction,
  savePrinterConfigAction,
  setBackupDirAction,
  detectPrintersAction,
  performAutoBackupAction,
  saveInvoiceSettingsAction,
} from "@/app/actions/settings";
import theme from "@/theme";
import { BackupFileInfo } from "@/lib/services/backup.service";
import { PrinterConfig } from "@/lib/services/printer.service";
import { InvoiceSettings } from "@/lib/services/invoice_settings.service";

interface SettingsManagerProps {
  initialBackups: BackupFileInfo[];
  initialPrinters: string[];
  initialPrinterConfig: PrinterConfig;
  initialInvoiceSettings?: InvoiceSettings;
  backupDirPath: string;
  isDirConfigured: boolean;
  masterCode?: string;
}

export default function SettingsManager({
  initialBackups,
  initialPrinters,
  initialPrinterConfig,
  initialInvoiceSettings,
  backupDirPath: initialBackupDirPath,
  isDirConfigured: initialIsDirConfigured,
  masterCode = "93KD-72HS-LPQ9-AJ23",
}: SettingsManagerProps) {
  const [isPwdPending, startPwdTransition] = useTransition();
  const [isPrinterPending, startPrinterTransition] = useTransition();
  const [isInvoicePending, startInvoiceTransition] = useTransition();
  const [isBackupPending, startBackupTransition] = useTransition();
  const [isDetectingPrinters, startDetectTransition] = useTransition();

  // Toast Notification State
  const [toastState, setToastState] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToastState({ message, type });
  };

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdFieldErrors, setPwdFieldErrors] = useState<Record<string, string[]>>({});

  // Backup & Storage Directory State
  const [backupDirPath, setBackupDirPath] = useState<string>(initialBackupDirPath);
  const [isDirConfigured, setIsDirConfigured] = useState<boolean>(initialIsDirConfigured);
  const [showDirSetupModal, setShowDirSetupModal] = useState<boolean>(!initialIsDirConfigured);
  const [customDirInput, setCustomDirInput] = useState<string>(initialBackupDirPath);
  const [editingDir, setEditingDir] = useState<boolean>(false);

  const [backups, setBackups] = useState<BackupFileInfo[]>(initialBackups);
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState<string | null>(null);

  // Printer State (Separate A4 and Thermal Printer Configurations)
  const [printers, setPrinters] = useState<string[]>(initialPrinters);
  const [selectedA4Printer, setSelectedA4Printer] = useState<string>(
    initialPrinterConfig.a4Printer || "Microsoft Print to PDF"
  );
  const [selectedThermalPrinter, setSelectedThermalPrinter] = useState<string>(
    initialPrinterConfig.thermalPrinter || initialPrinterConfig.defaultPrinter || (initialPrinters[0] ?? "POS-80 Thermal Printer")
  );
  const [paperType, setPaperType] = useState<"thermal_58mm" | "thermal_80mm" | "a4">(
    initialPrinterConfig.paperType || "thermal_80mm"
  );
  const [autoPrint, setAutoPrint] = useState<boolean>(
    initialPrinterConfig.autoPrintInvoice ?? true
  );

  // Invoice customization fields
  const [businessName, setBusinessName] = useState<string>(
    initialInvoiceSettings?.shopName || "WAHID ELECTRONICS"
  );
  const [tagline, setTagline] = useState<string>(
    initialInvoiceSettings?.tagline || "Authorized Electronics & Fan Retailer"
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(
    initialInvoiceSettings?.phoneNumber || "+92 300 1234567"
  );
  const [address, setAddress] = useState<string>(
    initialInvoiceSettings?.address || "Main Market Road, City Center"
  );
  const [invoicePrefix, setInvoicePrefix] = useState<string>(
    initialInvoiceSettings?.invoicePrefix || "INV-"
  );
  const [minStockWarning, setMinStockWarning] = useState<string>(
    (initialInvoiceSettings?.minStockWarning ?? 5).toString()
  );

  const a4Options = useMemo(() => {
    const list = [...printers];
    if (selectedA4Printer && !list.includes(selectedA4Printer)) {
      list.push(selectedA4Printer);
    }
    return list;
  }, [printers, selectedA4Printer]);

  const thermalOptions = useMemo(() => {
    const list = [...printers];
    if (selectedThermalPrinter && !list.includes(selectedThermalPrinter)) {
      list.push(selectedThermalPrinter);
    }
    return list;
  }, [printers, selectedThermalPrinter]);

  // 1. Handle Password Submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFieldErrors({});

    const errors: Record<string, string[]> = {};
    if (!currentPassword || currentPassword.trim().length === 0) {
      errors.currentPassword = ["Current password is required."];
    }
    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = ["New password must be at least 6 characters."];
    }
    if (confirmPassword !== newPassword) {
      errors.confirmPassword = ["Password confirmation must match."];
    }

    if (Object.keys(errors).length > 0) {
      setPwdFieldErrors(errors);
      showToast("Please correct the highlighted errors before submitting.", "error");
      focusFirstInvalidInput();
      return;
    }

    const formData = new FormData();
    formData.append("currentPassword", currentPassword);
    formData.append("newPassword", newPassword);
    formData.append("confirmPassword", confirmPassword);

    startPwdTransition(async () => {
      const res = await updatePasswordAction(formData);
      if (res.success) {
        showToast(res.message || "Admin password updated successfully!", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast(res.message || "Failed to update admin password.", "error");
        if (res.errors) setPwdFieldErrors(res.errors);
      }
    });
  };




  // 2. Handle Save Custom Backup Directory
  const handleSaveBackupDirectory = (pathValue: string) => {
    if (!pathValue || !pathValue.trim()) {
      showToast("Please provide a valid directory path.", "warning");
      return;
    }

    startBackupTransition(async () => {
      const res = await setBackupDirAction(pathValue);
      if (res.success && res.data) {
        setBackupDirPath(res.data);
        setIsDirConfigured(true);
        setShowDirSetupModal(false);
        setEditingDir(false);
        showToast("Backup storage directory configured successfully!", "success");
      } else {
        showToast(res.message || "Failed to set backup directory.", "error");
      }
    });
  };

  // Open native OS folder picker (Electron only), fall back to text input for web
  const handleOpenDirectoryPicker = async () => {
    if (typeof window !== "undefined" && (window as any).electronAPI?.openDirectoryDialog) {
      const selectedPath = await (window as any).electronAPI.openDirectoryDialog();
      if (selectedPath) {
        setCustomDirInput(selectedPath);
      }
    }
  };

  // 3. Handle Create Instant Backup
  const handleCreateBackup = () => {
    if (!isDirConfigured) {
      setShowDirSetupModal(true);
      return;
    }

    startBackupTransition(async () => {
      const res = await createBackupAction();
      if (res.success && res.data) {
        setBackups((prev) => [res.data!, ...prev]);
        showToast(res.message || "Database backup created successfully!", "success");
      } else {
        showToast(res.message || "Failed to create database backup.", "error");
      }
    });
  };

  // 4. Handle Restore Backup
  const handleConfirmRestore = (filename: string) => {
    startBackupTransition(async () => {
      const res = await restoreBackupAction(filename);
      if (res.success) {
        setSelectedBackupToRestore(null);

        if ((res as any).restartRequired && typeof window !== "undefined" && (window as any).electronAPI?.restartApp) {
          showToast(res.message || "Database restored! Restarting application...", "success");
          setTimeout(() => {
            (window as any).electronAPI.restartApp();
          }, 1500);
        } else {
          showToast("Database restored successfully!", "success");
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        showToast(res.message || "Failed to restore database backup.", "error");
      }
    });
  };

  // 5. Handle Save Printer Config
  const handleSavePrinterConfig = (e: React.FormEvent) => {
    e.preventDefault();

    const config: PrinterConfig = {
      a4Printer: selectedA4Printer,
      thermalPrinter: selectedThermalPrinter,
      defaultPrinter: selectedThermalPrinter,
      paperType,
      autoPrintInvoice: autoPrint,
    };

    startPrinterTransition(async () => {
      const res = await savePrinterConfigAction(config);
      if (res.success) {
        showToast("Printer configuration saved successfully!", "success");
      } else {
        showToast(res.message || "Failed to save printer configuration.", "error");
      }
    });
  };

  // 6. Handle Detect Connected Printers
  const handleDetectPrinters = () => {
    startDetectTransition(async () => {
      const res = await detectPrintersAction();
      if (res.success && res.data) {
        const detectedList = res.data;
        setPrinters((prev) => {
          const merged = [...detectedList];
          for (const p of prev) {
            if (!merged.includes(p)) {
              merged.push(p);
            }
          }
          return merged;
        });

        if (detectedList.length === 0 || (detectedList.length === 1 && detectedList[0] === "Microsoft Print to PDF")) {
          showToast("No hardware printers connected. Available printer driver: Microsoft Print to PDF.", "info");
        } else {
          showToast(`Detected ${detectedList.length} printer(s) connected to PC!`, "success");
        }
      } else {
        showToast(res.message || "Failed to detect connected printers.", "error");
      }
    });
  };

  const handleSaveInvoiceCustomization = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      showToast("Business / Shop Name is required.", "warning");
      return;
    }

    startInvoiceTransition(async () => {
      const res = await saveInvoiceSettingsAction({
        shopName: businessName,
        tagline,
        phoneNumber,
        address,
        invoicePrefix,
        minStockWarning: Number(minStockWarning) || 5,
      });
      if (res.success) {
        showToast("Invoice & Business Customization settings saved successfully!", "success");
      } else {
        showToast(res.message || "Failed to save invoice settings.", "error");
      }
    });
  };

  const { t } = useI18n();

  return (
    <div className="h-full p-2.5 space-y-2 overflow-hidden flex flex-col justify-start">
      <Toast
        message={toastState?.message || null}
        type={toastState?.type || "info"}
        onClose={() => setToastState(null)}
        duration={4000}
      />

      <PageHeader
        title={t("settings.title")}
        icon={<Settings className="w-4 h-4 text-[#19444f]" />}
      />

      {/* Unconfigured Backup Directory Alert Callout */}
      {!isDirConfigured && (
        <div className="p-2 rounded-lg bg-[#fff8e1] border border-[#ffecb3] flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center space-x-2 text-[#8c6b00]">
            <FolderPlus className="w-4 h-4 text-[#b78103] shrink-0" />
            <div>
              <h3 className="text-xs font-bold">First-Time Setup: Choose Backup Directory</h3>
              <p className="text-[10px] text-[#8c6b00]">
                Specify folder location (e.g. D:\Backups) for automated SQLite backups.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            onClick={() => setShowDirSetupModal(true)}
          >
            Configure Directory
          </Button>
        </div>
      )}

      {/* 3-Column Single-Row Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 flex-1 min-h-0">

        {/* Card 1: Admin Security */}
        <Card variant="default" className="flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-[#e0e3e5]">
              <div className="p-1.5 rounded bg-[#335c67]/10 text-[#19444f]">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#191c1e]">Admin Password</h2>
                <p className="text-[10px] text-[#71787b]">Credentials & password recovery</p>
              </div>
            </div>

            <form id="pwdForm" onSubmit={handlePasswordSubmit} className="space-y-2" noValidate>
              {/* Current Password */}
              <Input
                label="Current Password *"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isPwdPending}
                required
                error={pwdFieldErrors.currentPassword?.[0]}
                sizeVariant="sm"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="text-[#71787b] hover:text-[#191c1e] cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
              />

              {/* New Password */}
              <Input
                label="New Password *"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                disabled={isPwdPending}
                required
                error={pwdFieldErrors.newPassword?.[0]}
                sizeVariant="sm"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-[#71787b] hover:text-[#191c1e] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
              />

              {/* Confirm Password */}
              <Input
                label="Confirm New Password *"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={isPwdPending}
                required
                error={pwdFieldErrors.confirmPassword?.[0]}
                sizeVariant="sm"
                leftIcon={<Lock className="w-3.5 h-3.5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[#71787b] hover:text-[#191c1e] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                }
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isPwdPending}
                className="w-full"
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                {isPwdPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </div>
        </Card>

        {/* Card 2: Printer Configurations (A4 & Thermal) */}
        <Card variant="default" className="flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#e0e3e5]">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-[#335c67]/10 text-[#19444f]">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#191c1e]">Printer Configurations</h2>
                  <p className="text-[10px] text-[#71787b]">Configure separate A4 and Thermal printers</p>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={handleDetectPrinters}
                disabled={isDetectingPrinters || isPrinterPending}
                leftIcon={<RefreshCw className={`w-3 h-3 ${isDetectingPrinters ? "animate-spin" : ""}`} />}
                title="Scan system for connected printers"
              >
                {isDetectingPrinters ? "Detecting..." : "Detect Printers"}
              </Button>
            </div>

            <form id="printerForm" onSubmit={handleSavePrinterConfig} className="space-y-2.5" noValidate>
              {/* 1. A4 Document Printer */}
              <Select
                label="Default A4 Document Printer"
                value={selectedA4Printer}
                onChange={(e) => setSelectedA4Printer(e.target.value)}
                disabled={isPrinterPending}
                sizeVariant="sm"
              >
                {a4Options.map((p) => (
                  <option key={`a4-${p}`} value={p}>
                    {p}
                  </option>
                ))}
              </Select>

              {/* 2. Thermal Receipt Printer */}
              <Select
                label="Default Thermal Receipt Printer"
                value={selectedThermalPrinter}
                onChange={(e) => setSelectedThermalPrinter(e.target.value)}
                disabled={isPrinterPending}
                sizeVariant="sm"
              >
                {thermalOptions.map((p) => (
                  <option key={`thermal-${p}`} value={p}>
                    {p}
                  </option>
                ))}
              </Select>

              {/* Paper Format */}
              <div>
                <label className="block text-[11px] font-semibold text-[#41484a] mb-0.5">
                  Default Receipt Paper Format
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant={paperType === "thermal_80mm" ? "primary" : "secondary"}
                    size="xs"
                    onClick={() => setPaperType("thermal_80mm")}
                    className="flex-col py-1 h-auto"
                  >
                    <div className="text-[11px] font-bold">80mm</div>
                    <div className="text-[9px] opacity-75">Standard</div>
                  </Button>
                  <Button
                    type="button"
                    variant={paperType === "thermal_58mm" ? "primary" : "secondary"}
                    size="xs"
                    onClick={() => setPaperType("thermal_58mm")}
                    className="flex-col py-1 h-auto"
                  >
                    <div className="text-[11px] font-bold">58mm</div>
                    <div className="text-[9px] opacity-75">Compact</div>
                  </Button>
                  <Button
                    type="button"
                    variant={paperType === "a4" ? "primary" : "secondary"}
                    size="xs"
                    onClick={() => setPaperType("a4")}
                    className="flex-col py-1 h-auto"
                  >
                    <div className="text-[11px] font-bold">A4</div>
                    <div className="text-[9px] opacity-75">Invoice</div>
                  </Button>
                </div>
              </div>

              {/* Auto Print Toggle */}
              <div className="p-2 rounded bg-[#f2f4f6] border border-[#e0e3e5] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#191c1e] block">
                    Auto-Print POS Invoice
                  </span>
                  <span className="text-[9px] text-[#71787b] block">
                    Open print dialog automatically on sale
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="w-3.5 h-3.5 text-[#19444f] rounded border-[#e0e3e5] focus:ring-[#19444f] cursor-pointer"
                />
              </div>
            </form>
          </div>

          <div className="pt-2 border-t border-[#e0e3e5] mt-2">
            <Button
              type="submit"
              form="printerForm"
              variant="primary"
              size="sm"
              disabled={isPrinterPending}
              className="w-full"
              leftIcon={<PrinterCheck className="w-3.5 h-3.5" />}
            >
              {isPrinterPending ? "Saving..." : "Save Printer Config"}
            </Button>
          </div>
        </Card>

        {/* Card 3: Database Storage & Backups */}
        <Card variant="default" className="flex flex-col justify-between min-h-0">
          <div className="min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#e0e3e5] shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-[#335c67]/10 text-[#19444f]">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#191c1e]">Database & Backups</h2>
                  <p className="text-[10px] text-[#71787b]">Storage path & backups</p>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="xs"
                onClick={handleCreateBackup}
                disabled={isBackupPending}
                leftIcon={<HardDrive className="w-3 h-3" />}
              >
                {isBackupPending ? "Backing up..." : "Backup Now"}
              </Button>
            </div>

            {/* Path Callout */}
            <div className="p-2 rounded bg-[#f2f4f6] border border-[#e0e3e5] flex items-center justify-between mb-2 shrink-0">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] font-semibold text-[#71787b] uppercase tracking-wider block">
                  Active Backup Folder
                </span>
                <span className="text-[11px] font-mono text-[#191c1e] font-bold truncate block">
                  {backupDirPath || "Not Configured"}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={() => {
                  setCustomDirInput(backupDirPath);
                  setEditingDir(!editingDir);
                }}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </div>

            {/* Inline Path Editor */}
            {editingDir && (
              <div className="p-2 rounded bg-[#bfe9f7]/30 border border-[#19444f]/20 mb-2 shrink-0 space-y-1">
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customDirInput}
                    onChange={(e) => setCustomDirInput(e.target.value)}
                    placeholder="D:\Backups"
                    className="flex-1 px-2 py-1 text-[11px] bg-white text-[#191c1e] border border-[#e0e3e5] rounded font-mono"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={handleOpenDirectoryPicker}
                    title="Browse for folder"
                  >
                    Browse…
                  </Button>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditingDir(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    onClick={() => handleSaveBackupDirectory(customDirInput)}
                    disabled={isBackupPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {/* Backups List Table */}
            <TableContainer className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="px-2 py-1 bg-[#f2f4f6] border-b border-[#e0e3e5] text-[10px] font-bold text-[#71787b] uppercase tracking-wider shrink-0">
                Backup Files ({backups.length})
              </div>

              <div className="overflow-y-auto flex-1 max-h-44 min-h-0">
                {backups.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-[#71787b]">
                    No backups created yet.
                  </div>
                ) : (
                  <Table>
                    <TableBody>
                      {backups.map((b) => (
                        <TableRow key={b.filename}>
                          <TableCell className="font-mono font-medium text-[#191c1e] truncate max-w-[120px]" title={b.filename}>
                            {b.filename}
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-[#71787b]">
                            {b.createdAt.split(" ")[0]}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="secondary"
                              size="xs"
                              onClick={() => setSelectedBackupToRestore(b.filename)}
                              disabled={isBackupPending}
                            >
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TableContainer>
          </div>
        </Card>
      </div>

      {/* Invoice & Business Customization Card / Section */}
      <Card variant="default" className="shrink-0 mt-2">
        <form onSubmit={handleSaveInvoiceCustomization} className="space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#e0e3e5]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded bg-[#335c67]/10 text-[#19444f]">
                <FileText className="w-4 h-4 text-[#19444f]" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#191c1e]">Invoice & Business Customization</h2>
                <p className="text-[10px] text-[#71787b]">
                  Shop info printed on sales invoices & automatic invoice numbering settings
                </p>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isInvoicePending}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {isInvoicePending ? "Saving..." : "Save Invoice Settings"}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 pt-1">
            {/* Business / Shop Name */}
            <div className="lg:col-span-2">
              <Input
                label="Business / Shop Name *"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="WAHID ELECTRONICS"
                disabled={isInvoicePending}
                required
                sizeVariant="sm"
                leftIcon={<Building2 className="w-3.5 h-3.5" />}
              />
            </div>

            {/* Tagline / Subtitle */}
            <div className="lg:col-span-2">
              <Input
                label="Tagline / Subtitle"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Authorized Electronics & Fan Retailer"
                disabled={isInvoicePending}
                sizeVariant="sm"
                leftIcon={<FileText className="w-3.5 h-3.5" />}
              />
            </div>

            {/* Phone Number */}
            <div className="lg:col-span-2">
              <Input
                label="Phone Number *"
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+92 300 1234567"
                disabled={isInvoicePending}
                required
                sizeVariant="sm"
                leftIcon={<Phone className="w-3.5 h-3.5" />}
              />
            </div>

            {/* Address */}
            <div className="lg:col-span-3">
              <Input
                label="Shop Address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Main Market Road, City Center"
                disabled={isInvoicePending}
                sizeVariant="sm"
                leftIcon={<Building2 className="w-3.5 h-3.5" />}
              />
            </div>

            {/* Invoice Prefix */}
            <div className="lg:col-span-2">
              <Input
                label="Invoice Prefix *"
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV-"
                disabled={isInvoicePending}
                required
                sizeVariant="sm"
                leftIcon={<Receipt className="w-3.5 h-3.5" />}
              />
            </div>

            {/* Low Stock Limit */}
            <div className="lg:col-span-1">
              <Input
                label="Min. Stock Limit"
                type="number"
                value={minStockWarning}
                onChange={(e) => setMinStockWarning(e.target.value)}
                placeholder="5"
                disabled={isInvoicePending}
                sizeVariant="sm"
                leftIcon={<CircleAlert className="w-3.5 h-3.5" />}
              />
            </div>
          </div>
        </form>
      </Card>

      {/* Directory Setup Modal */}
      <Modal
        isOpen={showDirSetupModal}
        onClose={() => setShowDirSetupModal(false)}
        title="Configure Backup Folder Path"
        subtitle="Specify local directory path (e.g. D:\Backups)"
        maxWidth="sm"
      >
        <div className="space-y-3">
          <Input
            type="text"
            value={customDirInput}
            onChange={(e) => setCustomDirInput(e.target.value)}
            placeholder="D:\Backups"
            sizeVariant="sm"
          />

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#e0e3e5]">
            {isDirConfigured && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowDirSetupModal(false)}
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSaveBackupDirectory(customDirInput)}
              disabled={isBackupPending}
            >
              Save Directory Path
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={Boolean(selectedBackupToRestore)}
        onClose={() => setSelectedBackupToRestore(null)}
        title="Restore Database Backup?"
        subtitle={selectedBackupToRestore ? `Replace active database with ${selectedBackupToRestore}?` : undefined}
        maxWidth="sm"
      >
        <div className="bg-[#fff8e1] border border-[#ffecb3] rounded p-2 mb-3 text-[10px] text-[#8c6b00]">
          <strong>Safety Protection:</strong> A pre-restore snapshot (<code className="font-mono text-[9px]">fims_prerestore_...</code>) will be automatically created before restoring.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e0e3e5]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSelectedBackupToRestore(null)}
            disabled={isBackupPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => selectedBackupToRestore && handleConfirmRestore(selectedBackupToRestore)}
            disabled={isBackupPending}
          >
            {isBackupPending ? "Restoring..." : "Confirm Restore"}
          </Button>
        </div>
      </Modal>
      <Watermark variant="page" />
    </div>
  );
}
