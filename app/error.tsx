"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary Captured]:", error);
  }, [error]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 p-6 md:p-8 max-w-md w-full text-center">
        <button
          onClick={() => reset()}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-100 transition"
          aria-label="Close error"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
        <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4 text-red-600">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {error.message || "An unexpected system error occurred. Don't worry, your data remains secure."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-xs hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
