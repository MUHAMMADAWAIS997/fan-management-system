import crypto from "crypto";

const SECRET_KEY = "FIMS_OFFLINE_SECURE_RECOVERY_KEY_2026";
const MASTER_CODE = "93KD-72HS-LPQ9-AJ23";

export class RecoveryService {
  /**
   * Get system Master Recovery Code
   */
  public getMasterCode(): string {
    return MASTER_CODE;
  }

  /**
   * Generate encrypted FanManagement.recovery payload
   */
  public generateRecoveryFileContent(): string {
    const payload = {
      app: "FanManagementSystem",
      system: "FIMS",
      master_code: MASTER_CODE,
      issued_at: new Date().toISOString(),
      status: "VALID_MASTER_RECOVERY_KEY",
    };

    const key = crypto.scryptSync(SECRET_KEY, "fims-salt-2026", 32);
    const iv = Buffer.alloc(16, 7); // deterministic IV for offline recovery file verification
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    
    let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
    encrypted += cipher.final("base64");

    return `FIMS-RECOVERY-KEY::${encrypted}`;
  }

  /**
   * Verify an uploaded recovery file content or master code string
   */
  public verifyRecoveryContent(content: string): boolean {
    if (!content || typeof content !== "string") return false;

    const raw = content.trim();

    // 1. Direct Master Reset Code comparison (case-insensitive, strip dashes/spaces)
    const cleanRaw = raw.toUpperCase().replace(/[\s-]/g, "");
    const cleanMaster = MASTER_CODE.toUpperCase().replace(/[\s-]/g, "");
    if (cleanRaw.includes(cleanMaster)) {
      return true;
    }

    // 2. Encrypted File Payload verification
    try {
      const encryptedData = raw.startsWith("FIMS-RECOVERY-KEY::")
        ? raw.replace("FIMS-RECOVERY-KEY::", "").trim()
        : raw;

      const key = crypto.scryptSync(SECRET_KEY, "fims-salt-2026", 32);
      const iv = Buffer.alloc(16, 7);
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

      let decrypted = decipher.update(encryptedData, "base64", "utf8");
      decrypted += decipher.final("utf8");

      const payload = JSON.parse(decrypted);

      return (
        payload &&
        payload.app === "FanManagementSystem" &&
        payload.master_code === MASTER_CODE
      );
    } catch {
      return false;
    }
  }
}

export const recoveryService = new RecoveryService();
