"use client";

import React from "react";
import theme from "@/theme";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className = "",
}) => {
  return (
    <div className={`${theme.styles.pageHeader} ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <div className={theme.styles.pageHeaderIcon}>{icon}</div>}
        <div>
          <h1 className={theme.styles.pageHeaderTitle}>
            {title}
          </h1>
          {subtitle && <p className={theme.styles.pageHeaderSubtitle}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
