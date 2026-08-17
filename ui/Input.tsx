"use client";

import React from "react";
import theme from "@/theme";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  sizeVariant?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      sizeVariant = "sm",
      fullWidth = true,
      className = "",
      wrapperClassName = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    let sizeStyles = "py-1.5 text-xs h-9";
    if (sizeVariant === "md") {
      sizeStyles = "py-2 text-sm h-9.5";
    } else if (sizeVariant === "lg") {
      sizeStyles = "py-2.5 text-base h-11";
    }

    const paddingLeft = leftIcon ? "pl-8" : "pl-3";
    const paddingRight = rightIcon ? "pr-8" : "pr-3";

    const baseInputStyles = theme.styles.input;
    const errorInputStyles = error ? theme.styles.inputError : "";

    return (
      <div className={`${fullWidth ? "w-full" : ""} ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`${theme.styles.label} text-xs`}
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div
              className="absolute left-2.5 pointer-events-none flex items-center justify-center"
              style={{ color: theme.colors.textMuted }}
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`${baseInputStyles} ${sizeStyles} ${paddingLeft} ${paddingRight} ${errorInputStyles} ${
              fullWidth ? "w-full" : ""
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div
              className="absolute right-2.5 pointer-events-none flex items-center justify-center"
              style={{ color: theme.colors.textMuted }}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className={theme.styles.inputErrorText}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
