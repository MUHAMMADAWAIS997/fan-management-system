import React from "react";
import theme from "@/theme";

export interface WatermarkProps {
  /**
   * "receipt": Bold opacity, placed at the end of receipts/invoices/purchase orders (print & screen).
   * "page": Low opacity, placed at the bottom of pages, dashboards, and reports.
   */
  variant?: "receipt" | "page";
  className?: string;
}

export function Watermark({ variant = "page", className = "" }: WatermarkProps) {
  if (variant === "receipt") {
    return (
      <div className={`${theme.styles.watermarkReceipt} ${className}`}>
        Software by{" "}
        <a
          href="https://intefig.com"
          target="_blank"
          rel="noopener noreferrer"
          className={theme.styles.watermarkReceiptLink}
        >
          INTEFIG
        </a>{" "}
        - 03359940100
      </div>
    );
  }

  return (
    <div className={`${theme.styles.watermarkPage} ${className}`}>
      Software by{" "}
      <a
        href="https://intefig.com"
        target="_blank"
        rel="noopener noreferrer"
        className={theme.styles.watermarkPageLink}
      >
        INTEFIG
      </a>{" "}
      - 0335 99 40 100
    </div>
  );
}

export default Watermark;
