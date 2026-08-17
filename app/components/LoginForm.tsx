"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  loginAction,
  resetPasswordWithMasterKeyAction,
  generateRecoveryFileAction,
} from "@/app/actions/auth";
import Toast from "@/app/components/Toast";
import {
  validateRequiredText,
  focusFirstInvalidInput,
} from "@/lib/validations/helpers";
import theme from "@/theme";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  FileCode,
  Upload,
  Download,
  FileCheck,
} from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View Mode: "login" | "forgot"
  const [viewMode, setViewMode] = useState<"login" | "forgot">("login");

  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password / Master Reset State
  const [masterCode, setMasterCode] = useState("");
  const [recoveryFileName, setRecoveryFileName] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status & Error States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const errors: Record<string, string[]> = {};
    const uErr = validateRequiredText(username, "Username", 1);
    if (uErr) errors.username = [uErr];

    const pErr = validateRequiredText(password, "Password", 1);
    if (pErr) errors.password = [pErr];

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("Please fill in all required login fields.");
      focusFirstInvalidInput();
      return;
    }

    const formData = new FormData();
    formData.append("username", username.trim());
    formData.append("password", password);

    startTransition(async () => {
      const res = await loginAction(formData);
      if (res.success) {
        router.push("/sales/add");
        router.refresh();
      } else {
        setErrorMessage(res.message || "Authentication failed. Invalid username or password.");
        if (res.errors) {
          setFieldErrors(res.errors);
        }
      }
    });
  };

  // Handle Recovery File Upload (.recovery / FanManagement.recovery)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setMasterCode(text);
        setRecoveryFileName(file.name);
        setErrorMessage(null);
        if (fieldErrors.masterCode) {
          setFieldErrors((prev) => ({ ...prev, masterCode: [] }));
        }
      }
    };
    reader.readAsText(file);
  };

  // Download Encrypted Recovery File for USB Drive storage
  const handleDownloadRecoveryFile = async () => {
    try {
      const fileContent = await generateRecoveryFileAction();
      const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "FanManagement.recovery");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("Failed to generate recovery file for download.");
    }
  };

  const handleResetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const errors: Record<string, string[]> = {};
    if (!masterCode.trim()) {
      errors.masterCode = ["Select a recovery file or enter Master Code"];
    }
    if (!newPassword.trim()) {
      errors.newPassword = ["New password is required"];
    } else if (newPassword.length < 4) {
      errors.newPassword = ["Password must be at least 4 characters"];
    }
    if (!confirmPassword.trim()) {
      errors.confirmPassword = ["Please confirm your new password"];
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = ["Passwords do not match"];
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage("Please correct the highlighted recovery errors before submitting.");
      focusFirstInvalidInput();
      return;
    }

    startTransition(async () => {
      const res = await resetPasswordWithMasterKeyAction(
        masterCode,
        newPassword,
        confirmPassword,
        username.trim() || undefined
      );

      if (res.success) {
        setSuccessMessage(res.message || "Password reset successfully!");
        setTimeout(() => {
          router.push("/sales/add");
          router.refresh();
        }, 1000);
      } else {
        setErrorMessage(res.message || "Invalid Recovery File or Master Reset Code.");
        if (res.errors) {
          setFieldErrors(res.errors);
        }
      }
    });
  };

  return (
    <div className={`w-full max-w-md p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 ${theme.styles.loginCard}`}>
      <Toast message={errorMessage} type="error" onClose={() => setErrorMessage(null)} duration={4000} />
      {successMessage && (
        <Toast message={successMessage} type="success" onClose={() => setSuccessMessage(null)} duration={4000} />
      )}

      {/* Header & Logo */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className={`w-12 h-12 p-2.5 shadow-2xs ${theme.styles.loginHeaderIcon}`}>
          <img src="/favicon.ico" alt="FIMS" className="w-7 h-7 object-contain" />
        </div>
        <div>
          <h1 className={`text-xl ${theme.styles.title}`}>
            {viewMode === "login" ? "System Login" : "Encrypted Password Recovery"}
          </h1>
          <p className={`text-xs mt-0.5 ${theme.styles.subtitle}`}>
            {viewMode === "login"
              ? "Fan Inventory & Sales Management System"
              : "Select recovery file from USB drive or enter Master Code"}
          </p>
        </div>
      </div>

      {viewMode === "login" ? (
        /* NORMAL LOGIN FORM */
        <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
          {/* Username */}
          <div>
            <label className={theme.styles.label}>
              Username <span style={{ color: theme.colors.errorText }}>*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                name="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({ ...prev, username: [] }));
                  }
                }}
                placeholder="Enter username"
                disabled={isPending}
                required
                className={`w-full pl-9 pr-3 py-2 text-xs ${theme.styles.input} ${
                  fieldErrors.username?.[0] ? "border-red-500" : ""
                }`}
              />
            </div>
            {fieldErrors.username?.[0] && (
              <p className="mt-1 text-xs font-semibold flex items-center gap-1" style={{ color: theme.colors.errorText }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.username[0]}</span>
              </p>
            )}
          </div>

          {/* Password Field with Forgot Password Link */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={theme.styles.label}>
                Password <span style={{ color: theme.colors.errorText }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setViewMode("forgot");
                  setErrorMessage(null);
                  setFieldErrors({});
                }}
                className="text-[11px] font-bold hover:underline cursor-pointer"
                style={{ color: theme.colors.primary }}
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: [] }));
                  }
                }}
                placeholder="Enter password"
                disabled={isPending}
                required
                className={`w-full pl-9 pr-9 py-2 text-xs ${theme.styles.input} ${
                  fieldErrors.password?.[0] ? "border-red-500" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {fieldErrors.password?.[0] && (
              <p className="mt-1 text-xs font-semibold flex items-center gap-1" style={{ color: theme.colors.errorText }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.password[0]}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className={`w-full py-2.5 px-4 text-xs ${theme.styles.loginSubmitButton}`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In to System</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* FORGOT PASSWORD / RECOVERY FILE FORM */
        <form onSubmit={handleResetSubmit} className="space-y-3.5" noValidate>
         
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".recovery,.key,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* USB Recovery File Selection Box */}
          <div>
            <label className={theme.styles.label}>
              Select Recovery File 
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="flex-1 py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-md shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" style={{ color: theme.colors.primaryContainer }} />
                <span>{recoveryFileName ? "Change Recovery File" : "Select FanManagement.recovery"}</span>
              </button>
            </div>

            {recoveryFileName && (
              <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Loaded: {recoveryFileName}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold tracking-wider my-1">
            <div className="flex-1 border-t border-slate-200"></div>
            <span>Or Enter Code Manually</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* Master Reset Code Input Fallback */}
          <div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: theme.colors.primaryContainer }} />
              <input
                type="text"
                value={masterCode.startsWith("FIMS-RECOVERY-KEY::") ? "Encrypted File Loaded" : masterCode}
                onChange={(e) => {
                  setMasterCode(e.target.value);
                  setRecoveryFileName(null);
                  if (fieldErrors.masterCode) {
                    setFieldErrors((prev) => ({ ...prev, masterCode: [] }));
                  }
                }}
                placeholder="Enter Master Code (e.g. 12AB-23CD-EFGH-56IJ)"
                disabled={isPending || masterCode.startsWith("FIMS-RECOVERY-KEY::")}
                className={`w-full pl-9 pr-3 py-2 text-xs font-mono font-bold tracking-wide ${theme.styles.input} ${
                  fieldErrors.masterCode?.[0] ? "border-red-500" : ""
                }`}
              />
            </div>
            {fieldErrors.masterCode?.[0] && (
              <p className="mt-1 text-xs font-semibold flex items-center gap-1" style={{ color: theme.colors.errorText }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.masterCode[0]}</span>
              </p>
            )}
          </div>

          {/* New Password Input */}
          <div>
            <label className={theme.styles.label}>
              New Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (fieldErrors.newPassword) {
                    setFieldErrors((prev) => ({ ...prev, newPassword: [] }));
                  }
                }}
                placeholder="Enter new password"
                disabled={isPending}
                required
                className={`w-full pl-9 pr-9 py-2 text-xs ${theme.styles.input} ${
                  fieldErrors.newPassword?.[0] ? "border-red-500" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {fieldErrors.newPassword?.[0] && (
              <p className="mt-1 text-xs font-semibold flex items-center gap-1" style={{ color: theme.colors.errorText }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.newPassword[0]}</span>
              </p>
            )}
          </div>

          {/* Confirm New Password Input */}
          <div>
            <label className={theme.styles.label}>
              Confirm New Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showNewPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: [] }));
                  }
                }}
                placeholder="Confirm new password"
                disabled={isPending}
                required
                className={`w-full pl-9 pr-3 py-2 text-xs ${theme.styles.input} ${
                  fieldErrors.confirmPassword?.[0] ? "border-red-500" : ""
                }`}
              />
            </div>
            {fieldErrors.confirmPassword?.[0] && (
              <p className="mt-1 text-xs font-semibold flex items-center gap-1" style={{ color: theme.colors.errorText }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.confirmPassword[0]}</span>
              </p>
            )}
          </div>

          {/* Reset Action Button */}
          <button
            type="submit"
            disabled={isPending}
            className={`w-full py-2.5 px-4 text-xs ${theme.styles.loginSubmitButton}`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Recovery File...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify File & Reset Password</span>
              </>
            )}
          </button>

          {/* Back to Login Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setViewMode("login");
                setErrorMessage(null);
                setFieldErrors({});
              }}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Normal Login</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
