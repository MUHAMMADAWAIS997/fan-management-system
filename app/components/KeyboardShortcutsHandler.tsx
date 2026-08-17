"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Zoom step size (10%)
const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;

function getZoomLevel(): number {
  if (typeof window !== "undefined" && (window as any).electronAPI?.getZoomLevel) {
    return (window as any).electronAPI.getZoomLevel() ?? 1;
  }
  return parseFloat((document.body.style as any).zoom || "1") || 1;
}

function applyZoom(level: number) {
  const clamped = Math.min(Math.max(level, ZOOM_MIN), ZOOM_MAX);
  if (typeof window !== "undefined" && (window as any).electronAPI?.setZoomLevel) {
    (window as any).electronAPI.setZoomLevel(clamped);
  } else {
    (document.body.style as any).zoom = String(clamped);
  }
}

export default function KeyboardShortcutsHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // ── Ctrl + S  →  Submit active form ──────────────────────────────────
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const submitBtn = document.querySelector<HTMLButtonElement>(
          'button[type="submit"]:not([disabled])'
        );
        if (submitBtn) submitBtn.click();
      }

      // ── Ctrl + P  →  Trigger print button ────────────────────────────────
      if (ctrl && e.key.toLowerCase() === "p") {
        const printBtn = document.querySelector<HTMLButtonElement>(
          '[data-shortcut="print"], button:has(.lucide-printer)'
        );
        if (printBtn) {
          e.preventDefault();
          printBtn.click();
        }
      }

      // ── Ctrl + =  /  Ctrl + +  →  Zoom In ────────────────────────────────
      if (ctrl && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        applyZoom(getZoomLevel() + ZOOM_STEP);
      }

      // ── Ctrl + -  →  Zoom Out ─────────────────────────────────────────────
      if (ctrl && e.key === "-") {
        e.preventDefault();
        applyZoom(getZoomLevel() - ZOOM_STEP);
      }

      // ── Ctrl + 0  →  Reset Zoom ───────────────────────────────────────────
      if (ctrl && e.key === "0") {
        e.preventDefault();
        applyZoom(1);
      }

      // ── Ctrl + Home  →  Dashboard ─────────────────────────────────────────
      if (ctrl && e.key === "Home") {
        e.preventDefault();
        router.push("/home");
      }

      // ── Ctrl + N  →  New Sale ────────────────────────────────────────────
      if (ctrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/sales/add");
      }

      // ── F-key navigation ──────────────────────────────────────────────────
      if (e.key === "F1") {
        e.preventDefault();
        router.push("/sales/add");
      } else if (e.key === "F2") {
        e.preventDefault();
        router.push("/receive-stock");
      } else if (e.key === "F3") {
        e.preventDefault();
        router.push("/settings");
      } else if (e.key === "F4") {
        e.preventDefault();
        router.push("/home");
      } else if (e.key === "F5") {
        e.preventDefault();
        router.push("/sales");
      } else if (e.key === "F6") {
        e.preventDefault();
        router.push("/products");
      } else if (e.key === "F7") {
        e.preventDefault();
        router.push("/customers");
      } else if (e.key === "F8") {
        e.preventDefault();
        router.push("/expenses");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
