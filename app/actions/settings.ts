"use server";

import { authService } from "@/lib/services/auth.service";
import { passwordService } from "@/lib/services/password.service";
import { userRepository } from "@/lib/repositories/user.repository";
import { backupService, BackupFileInfo } from "@/lib/services/backup.service";
import { printerService, PrinterConfig } from "@/lib/services/printer.service";
import { invoiceSettingsService, InvoiceSettings } from "@/lib/services/invoice_settings.service";
import { ActionResult } from "@/lib/types/auth";
import { revalidatePath } from "next/cache";

/**
 * Update Admin Password Action
 */
export async function updatePasswordAction(
  formData: FormData
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const currentUser = await authService.getCurrentSessionUser();
    if (!currentUser) {
      return { success: false, message: "Unauthorized. Please log in first." };
    }

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    const errors: Record<string, string[]> = {};

    if (!currentPassword) {
      errors.currentPassword = ["Current password is required."];
    }
    if (!newPassword || newPassword.length < 6) {
      errors.newPassword = ["New password must be at least 6 characters long."];
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = ["Passwords do not match."];
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, message: "Form validation failed.", errors };
    }

    // Verify current password against DB hash
    const userInDb = userRepository.findById(currentUser.id);
    if (!userInDb) {
      return { success: false, message: "User account not found." };
    }

    const isMatch = await passwordService.comparePassword(
      currentPassword,
      userInDb.password_hash
    );

    if (!isMatch) {
      return {
        success: false,
        message: "Incorrect current password.",
        errors: { currentPassword: ["Current password is incorrect."] },
      };
    }

    // Hash new password and update in DB
    const newHash = await passwordService.hashPassword(newPassword);
    userRepository.updatePassword(currentUser.id, newHash);

    return {
      success: true,
      message: "Password updated successfully. Use your new password on next login.",
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to update password.",
    };
  }
}

/**
 * Create Local Backup in AppData Action
 */
export async function createBackupAction(): Promise<ActionResult<BackupFileInfo>> {
  try {
    const currentUser = await authService.getCurrentSessionUser();
    if (!currentUser) {
      return { success: false, message: "Unauthorized." };
    }

    const backup = await backupService.createBackup();
    revalidatePath("/settings");

    return {
      success: true,
      message: `Database backup created successfully in AppData folder: ${backup.filename}`,
      data: backup,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to create database backup.",
    };
  }
}

/**
 * List Local Backups Action
 */
export async function listBackupsAction(): Promise<BackupFileInfo[]> {
  return backupService.listBackups();
}

/**
 * Perform Automatic Daily Backup Action
 */
export async function performAutoBackupAction(): Promise<ActionResult<BackupFileInfo | null>> {
  try {
    const backup = await backupService.performAutoBackup();
    revalidatePath("/settings");
    return {
      success: true,
      message: backup ? "Auto-backup verified/created successfully." : "Today's auto-backup already exists.",
      data: backup,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to perform automatic daily backup.",
    };
  }
}

/**
 * Restore Local Backup Action
 */
export async function restoreBackupAction(
  filename: string
): Promise<ActionResult<boolean> & { restartRequired?: boolean }> {
  try {
    const currentUser = await authService.getCurrentSessionUser();
    if (!currentUser) {
      return { success: false, message: "Unauthorized." };
    }

    await backupService.restoreBackup(filename);
    revalidatePath("/settings");

    return {
      success: true,
      message: `Database restored successfully from "${filename}". A pre-restore safety snapshot was automatically created.`,
      data: true,
    };
  } catch (error: any) {
    // In Electron mode, backup.service throws { restartRequired: true } after a
    // successful restore because the DB connection is permanently closed.
    // The renderer should call window.electronAPI.restartApp() when it sees this flag.
    if (error?.restartRequired === true) {
      return {
        success: true,
        message: `Database restored from "${filename}". The application will now restart to load the restored data.`,
        data: true,
        restartRequired: true,
      };
    }

    return {
      success: false,
      message: error?.message || "Failed to restore backup file.",
    };
  }
}

/**
 * Save Custom Backup Directory Action
 */
export async function setBackupDirAction(
  dirPath: string
): Promise<ActionResult<string>> {
  try {
    const currentUser = await authService.getCurrentSessionUser();
    if (!currentUser) {
      return { success: false, message: "Unauthorized." };
    }

    const savedPath = backupService.setBackupDir(dirPath);
    revalidatePath("/settings");

    return {
      success: true,
      message: `Backup directory configured successfully: ${savedPath}`,
      data: savedPath,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to save backup directory path.",
    };
  }
}

/**
 * Fetch Attached System Printers Action
 */
export async function getPrintersAction(): Promise<{
  printers: string[];
  config: PrinterConfig;
}> {
  const printers = printerService.getAttachedPrinters();
  const config = printerService.getPrinterConfig();
  return { printers, config };
}

/**
 * Detect Printers connected to the system Action
 */
export async function detectPrintersAction(): Promise<ActionResult<string[]>> {
  try {
    const printers = printerService.getAttachedPrinters();
    return {
      success: true,
      message: `Detected ${printers.length} printer(s) connected to system.`,
      data: printers,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to detect connected printers.",
    };
  }
}

/**
 * Save Printer Preferences Action
 */
export async function savePrinterConfigAction(
  config: PrinterConfig
): Promise<ActionResult<PrinterConfig>> {
  try {
    const currentUser = await authService.getCurrentSessionUser();
    if (!currentUser) {
      return { success: false, message: "Unauthorized." };
    }

    const saved = printerService.savePrinterConfig(config);
    revalidatePath("/settings");

    return {
      success: true,
      message: "Printer preferences saved successfully.",
      data: saved,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to save printer configuration.",
    };
  }
}

/**
 * Fetch Invoice Customization Settings Action
 */
export async function getInvoiceSettingsAction(): Promise<InvoiceSettings> {
  return invoiceSettingsService.getInvoiceSettings();
}

/**
 * Save Invoice Customization Settings Action
 */
export async function saveInvoiceSettingsAction(
  settings: Partial<InvoiceSettings>
): Promise<ActionResult<InvoiceSettings>> {
  try {
    const currentUser = await authService.getCurrentSessionUser();
    if (!currentUser) {
      return { success: false, message: "Unauthorized." };
    }

    const saved = invoiceSettingsService.saveInvoiceSettings(settings);
    revalidatePath("/settings");
    revalidatePath("/sales/add");

    return {
      success: true,
      message: "Business invoice customization settings saved successfully.",
      data: saved,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to save invoice customization settings.",
    };
  }
}

/**
 * Generate Next Dynamic Invoice Number Action
 */
export async function getNextInvoiceNumberAction(saleDate?: string): Promise<string> {
  return invoiceSettingsService.generateNextInvoiceNumber(saleDate);
}

