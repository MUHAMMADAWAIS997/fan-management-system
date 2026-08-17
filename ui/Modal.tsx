"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import theme from "@/theme";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let widthClass = "max-w-md";
  if (maxWidth === "sm") widthClass = "max-w-sm";
  else if (maxWidth === "lg") widthClass = "max-w-lg";
  else if (maxWidth === "xl") widthClass = "max-w-xl";
  else if (maxWidth === "2xl") widthClass = "max-w-2xl";

  return (
    <div className={theme.styles.modalOverlay}>
      <div
        className={`${theme.styles.modalCard} ${widthClass}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={theme.styles.modalHeader}>
          <div className="flex items-center gap-2">
            {icon && <div className={theme.styles.modalIcon}>{icon}</div>}
            <div>
              <h2 className={theme.styles.modalTitle}>{title}</h2>
              {subtitle && <p className={theme.styles.modalSubtitle}>{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className={theme.styles.modalCloseButton}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className={theme.styles.modalBody}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className={theme.styles.modalFooter}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
