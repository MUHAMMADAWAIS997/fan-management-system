"use client";

import React from "react";
import theme from "@/theme";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
  action?: React.ReactNode;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendType = "neutral",
  action,
  className = "",
}) => {
  let trendColor: string = theme.styles.statCardNeutralTrend;
  if (trendType === "positive") trendColor = theme.styles.statCardPositiveTrend;
  else if (trendType === "negative") trendColor = theme.styles.statCardNegativeTrend;

  return (
    <div className={`${theme.styles.statCard} ${className}`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={theme.styles.statCardTitle}>{title}</span>
          {icon && <div className={theme.styles.statCardIcon}>{icon}</div>}
        </div>

        <div>
          <div className={theme.styles.statCardValue}>{value}</div>
          {(subtitle || trend) && (
            <div className={theme.styles.statCardSubtitle}>
              {subtitle && <span>{subtitle}</span>}
              {trend && <span className={trendColor}>{trend}</span>}
            </div>
          )}
        </div>
      </div>

      {action && (
        <div className={theme.styles.statCardAction}>
          {action}
        </div>
      )}
    </div>
  );
};

export default StatCard;
