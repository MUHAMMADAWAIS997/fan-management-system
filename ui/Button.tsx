"use client";

import React from "react";
import theme from "@/theme";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "sm",
      fullWidth = false,
      leftIcon,
      rightIcon,
      isLoading = false,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyles = theme.buttonVariants[variant] || theme.buttonVariants.primary;

    let sizeStyles = "px-3.5 py-1.5 text-xs h-9";
    if (size === "xs") {
      sizeStyles = "px-2.5 py-1 text-xs h-7.5";
    } else if (size === "md") {
      sizeStyles = "px-4.5 py-2 text-sm h-10";
    } else if (size === "lg") {
      sizeStyles = "px-5.5 py-2.5 text-base h-11.5";
    }

    const baseStyles =
      "font-semibold rounded-md transition-all shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const fullWidthStyle = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${fullWidthStyle} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full mr-1" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
