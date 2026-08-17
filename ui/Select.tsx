"use client";

import React from "react";
import theme from "@/theme";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  sizeVariant?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      sizeVariant = "sm",
      fullWidth = true,
      children,
      className = "",
      wrapperClassName = "",
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    let sizeStyles = "px-2.5 py-1.5 text-xs h-9";
    if (sizeVariant === "md") {
      sizeStyles = "px-3 py-2 text-sm h-9.5";
    } else if (sizeVariant === "lg") {
      sizeStyles = "px-3.5 py-2.5 text-base h-11";
    }

    const baseSelectStyles = theme.styles.select;
    const errorSelectStyles = error ? theme.styles.selectError : "";

    return (
      <div className={`${fullWidth ? "w-full" : ""} ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className={`${theme.styles.label} text-xs`}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`${baseSelectStyles} ${sizeStyles} ${errorSelectStyles} ${
            fullWidth ? "w-full" : ""
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className={theme.styles.inputErrorText}>{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
export default Select;
