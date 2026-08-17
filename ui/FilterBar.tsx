"use client";

import React from "react";
import theme from "@/theme";

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`${theme.styles.filterBar} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default FilterBar;
