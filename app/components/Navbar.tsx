"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { useI18n } from "@/lib/i18n-context";
import theme from "@/theme";
import {
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Building2,
  Package,
  Settings,
  Plus,
  Eye,
  Receipt,
  Globe,
} from "lucide-react";

import { Button, Modal } from "@/ui";

interface NavbarProps {
  activePageTitle?: string;
}

export default function Navbar({ activePageTitle = "FIMS" }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, language, toggleLanguage, isPending: isI18nPending } = useI18n();
  const [isPending, startTransition] = useTransition();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.push("/");
      router.refresh();
    });
  };

  const navItems = [
    {
      id: "dashboard",
      label: t("nav.dashboard"),
      href: "/home",
      icon: LayoutDashboard,
      isActive: pathname === "/home",
    },
    {
      id: "pos",
      label: t("nav.pos"),
      href: "/sales/add",
      icon: ShoppingCart,
      isActive: pathname === "/sales/add" || pathname === "/sales" || pathname.startsWith("/sales/"),
    },
    {
      id: "product",
      label: t("nav.product"),
      href: "/products",
      icon: Package,
      isActive: pathname.startsWith("/products"),
    },
    {
      id: "customer",
      label: t("nav.customer"),
      href: "/customers",
      icon: Users,
      isActive: pathname.startsWith("/customers") || pathname.startsWith("/customer-ledger"),
    },
    {
      id: "supplier",
      label: t("nav.supplier"),
      href: "/suppliers",
      icon: Building2,
      isActive: pathname.startsWith("/suppliers") || pathname.startsWith("/supplier-ledger"),
    },
    {
      id: "stock",
      label: t("nav.view_stock"),
      href: "/available-stock",
      icon: Eye,
      isActive: pathname.startsWith("/available-stock"),
    },
    {
      id: "receive-stock",
      label: t("nav.receive_stock"),
      href: "/receive-stock/add",
      icon: Plus,
      isActive: pathname.startsWith("/receive-stock"),
    },
    {
      id: "expense",
      label: t("nav.expense"),
      href: "/expenses",
      icon: Receipt,
      isActive: pathname.startsWith("/expenses"),
    },
    {
      id: "setting",
      label: t("nav.setting"),
      href: "/settings",
      icon: Settings,
      isActive: pathname.startsWith("/settings"),
    },
  ];

  return (
    <>
      <header className={theme.styles.navbar}>
        <div className="flex items-center space-x-4">
          {/* Brand */}
          <Link href="/sales/add" className="flex items-center space-x-2 shrink-0">
            <div className={theme.styles.brandBadge}>
              <img src="/favicon.ico" alt="FIMS" className="w-6 h-6 object-contain" />
            </div>
            <span className={`hidden sm:inline ${theme.styles.brandTitle}`}>
              FIMS
            </span>
          </Link>

          {/* Direct Navigation Links */}
          <nav className="flex items-center space-x-1.5 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`shrink-0 ${
                    item.isActive ? theme.styles.navLinkActive : theme.styles.navLinkInactive
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls: Language toggle + Logout Button */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toggleLanguage()}
            disabled={isI18nPending}
            title="Toggle Language (English / اردو)"
          >
            <span>{language === "ur" ? "Eng" : "اردو"}</span>
            <Globe className="w-4 h-4 text-sky-600" />
          </Button>

          {/* Logout Button */}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowLogoutModal(true)}
            disabled={isPending}
            leftIcon={<LogOut className="w-4 h-4" />}
            title={t("nav.logout")}
          >
            {isPending ? t("common.loading") : t("nav.logout")}
          </Button>
        </div>
      </header>

      {/* Logout Confirmation Dialog Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title={t("nav.logout")}
        subtitle="Are you sure you want to log out of your session?"
        icon={<LogOut className="w-4 h-4 text-rose-600" />}
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setShowLogoutModal(false)}
              disabled={isPending}
            >
              {t("buttons.cancel_logout")}
            </Button>
            <Button
              variant="danger"
              size="xs"
              onClick={handleConfirmLogout}
              isLoading={isPending}
            >
              {t("buttons.confirm_logout")}
            </Button>
          </>
        }
      >
        <p className="text-xs" style={{ color: theme.colors.onSurfaceVariant }}>
          Your active session will be closed safely and all data is saved.
        </p>
      </Modal>
    </>
  );
}
