import { authService } from "@/lib/services/auth.service";
import { redirect } from "next/navigation";
import theme from "@/theme";
import Navbar from "@/app/components/Navbar";
import DashboardManager from "./DashboardManager";
import { getDashboardMetricsAction } from "@/app/actions/dashboard";

export const revalidate = 0;

export default async function HomePage() {
  const user = await authService.getCurrentSessionUser();

  // Protect route: redirect to login if unauthenticated
  if (!user) {
    redirect("/");
  }

  const metrics = await getDashboardMetricsAction();

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Navbar activePageTitle="Dashboard" />
      <main className="flex-1 min-h-0 overflow-hidden">
        <DashboardManager metrics={metrics} username={user.username} />
      </main>
    </div>
  );
}
