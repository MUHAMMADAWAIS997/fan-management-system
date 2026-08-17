import { authService } from "@/lib/services/auth.service";
import { redirect } from "next/navigation";
import { getSummaryDataAction } from "@/app/actions/summary";
import { SummaryType } from "@/lib/services/summary.service";
import SummaryView from "./SummaryView";
import Navbar from "@/app/components/Navbar";
import theme from "@/theme";

export const revalidate = 0;

interface SummaryPageProps {
  searchParams: Promise<{
    type?: string;
  }>;
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const user = await authService.getCurrentSessionUser();

  if (!user) {
    redirect("/");
  }

  const { type: typeQuery } = await searchParams;
  const type: SummaryType = (typeQuery as SummaryType) || "sales";

  const initialReport = await getSummaryDataAction(type);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Historical Summary Report" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <SummaryView initialReport={initialReport} type={type} />
      </main>
    </div>
  );
}
