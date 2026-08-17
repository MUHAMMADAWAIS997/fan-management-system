"use client";

import React from "react";
import theme from "@/theme";

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  cardWrapper?: boolean;
}

export const TableContainer: React.FC<TableContainerProps> = ({
  children,
  cardWrapper = true,
  className = "",
  ...props
}) => {
  const containerStyle = cardWrapper
    ? theme.styles.tableContainer
    : "overflow-x-auto w-full";

  return (
    <div className={`${containerStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <table className={`${theme.styles.table} ${className}`} {...props}>
    {children}
  </table>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <thead className={`${theme.styles.tableHeaderRow} ${className}`} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <tbody className={`${theme.styles.tableBody} ${className}`} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <tr className={`${theme.styles.tableRow} ${className}`} {...props}>
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <th className={`${theme.styles.tableHead} ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <td className={`${theme.styles.tableCell} ${className}`} {...props}>
    {children}
  </td>
);

export default Table;
