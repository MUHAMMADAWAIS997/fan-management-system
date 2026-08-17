"use client";

import React from "react";
import theme from "@/theme";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "brand" | "info";
  size?: "xs" | "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  size = "sm",
  className = "",
  ...props
}) => {
  const variantStyles = theme.badgeVariants[variant] || theme.badgeVariants.primary;

  let sizeStyles = "px-2 py-0.5 text-xs font-semibold rounded-md";
  if (size === "xs") {
    sizeStyles = "px-1.5 py-0.5 text-[10px] font-semibold rounded";
  } else if (size === "md") {
    sizeStyles = "px-2.5 py-1 text-xs font-bold rounded-md";
  }

  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
