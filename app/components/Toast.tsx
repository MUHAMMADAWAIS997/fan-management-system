"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "error" | "success" | "warning" | "info";

export interface ToastProps {
  message: string | null;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "error",
  onClose,
  duration = 4000,
}: ToastProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message) return null;

  const bgStyle =
    type === "error"
      ? "bg-rose-600 text-white border-rose-700 shadow-rose-900/20"
      : type === "success"
      ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20"
      : type === "warning"
      ? "bg-amber-600 text-white border-amber-700 shadow-amber-900/20"
      : "bg-blue-600 text-white border-blue-700 shadow-blue-900/20";

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto max-w-md w-full px-3">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border shadow-lg text-xs font-semibold ${bgStyle}`}
      >
        <div className="flex items-center gap-2">
          {type === "error" && <AlertCircle className="w-4 h-4 shrink-0 text-white" />}
          {type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />}
          {type === "warning" && <AlertTriangle className="w-4 h-4 shrink-0 text-white" />}
          {type === "info" && <Info className="w-4 h-4 shrink-0 text-white" />}
          <span className="leading-snug">{message}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer shrink-0"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
