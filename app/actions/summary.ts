"use server";

import { summaryService, SummaryType, SummaryReportResult } from "@/lib/services/summary.service";

export async function getSummaryDataAction(
  type: SummaryType,
  startDate?: string,
  endDate?: string,
  searchQuery?: string
): Promise<SummaryReportResult> {
  try {
    return summaryService.getSummaryData(type, startDate, endDate, searchQuery);
  } catch (error: any) {
    console.error("Failed to fetch summary report data:", error);
    return {
      type,
      title: "Summary Report",
      subtitle: "Failed to load summary data.",
      columns: [],
      rows: [],
    };
  }
}
