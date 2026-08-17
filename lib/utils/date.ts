/**
 * lib/utils/date.ts — Date helper utilities for transaction modules & dashboard
 */

/**
 * Returns a YYYY-MM-DD date string for N days prior to current date.
 * Defaults to 60 days.
 */
export function getDefaultStartDate(daysAgo: number = 60): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's YYYY-MM-DD date string.
 */
export function getDefaultEndDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns YYYY-MM-01 for the start of the current month.
 */
export function getCurrentMonthStartDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Returns YYYY-MM-DD for the end of the current month.
 */
export function getCurrentMonthEndDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");
  const dayStr = String(lastDay).padStart(2, "0");
  return `${year}-${monthStr}-${dayStr}`;
}
