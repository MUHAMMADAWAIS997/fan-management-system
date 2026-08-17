"use client";

import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 md:p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
          <FileQuestion className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          The requested page or record could not be found. Please check the web address or navigate back to the main dashboard.
        </p>

        <Link
          href="/sales/add"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-xs hover:bg-blue-700 transition shadow-xs"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
