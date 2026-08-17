import type { Metadata } from "next";
import "./globals.css";
import KeyboardShortcutsHandler from "@/app/components/KeyboardShortcutsHandler";
import { I18nProvider } from "@/lib/i18n-context";
import { i18nService } from "@/lib/services/i18n.service";

export const metadata: Metadata = {
  title: "FIMS",
  description: "Fans Inventory and Sales Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLang = i18nService.getLanguage();
  const initialDict = i18nService.getTranslations(initialLang);

  return (
    <html
      lang={initialLang}
      dir="ltr"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-screen max-h-screen overflow-hidden flex flex-col bg-slate-50 text-slate-900 select-none" suppressHydrationWarning>
        <I18nProvider initialLanguage={initialLang} initialTranslations={initialDict}>
          <KeyboardShortcutsHandler />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

