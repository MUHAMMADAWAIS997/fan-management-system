import { authService } from "@/lib/services/auth.service";
import { redirect } from "next/navigation";
import LoginForm from "./components/LoginForm";
import theme from "@/theme";

export const revalidate = 0;

export default async function Home() {
  const user = await authService.getCurrentSessionUser();

  // If already authenticated, navigate to POS (add sale record)
  if (user) {
    redirect("/sales/add");
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: theme.colors.background }}
    >
      <LoginForm />
    </main>
  );
}
