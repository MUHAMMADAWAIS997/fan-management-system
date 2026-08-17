"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { getLanguageAction, toggleLanguageAction } from "@/app/actions/i18n";
import { Language, TranslationDictionary } from "@/lib/services/i18n.service";

interface I18nContextType {
  language: Language;
  translations: TranslationDictionary;
  toggleLanguage: (targetLang?: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
  isPending: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  children,
  initialLanguage = "en",
  initialTranslations = {},
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
  initialTranslations?: TranslationDictionary;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [translations, setTranslations] = useState<TranslationDictionary>(initialTranslations);
  const [isPending, startTransition] = useTransition();

  // Load active language on client mount if not passed
  useEffect(() => {
    startTransition(async () => {
      const res = await getLanguageAction();
      if (res.success && res.data) {
        setLanguageState(res.data.language);
        setTranslations(res.data.translations);
        updateHtmlAttributes(res.data.language);
      }
    });
  }, []);

  const updateHtmlAttributes = (lang: Language) => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = lang;
    }
  };

  const toggleLanguage = async (targetLang?: Language) => {
    startTransition(async () => {
      const res = await toggleLanguageAction(targetLang);
      if (res.success && res.data) {
        setLanguageState(res.data.language);
        setTranslations(res.data.translations);
        updateHtmlAttributes(res.data.language);
      }
    });
  };

  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split(".");
    let current: any = translations;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        current = undefined;
        break;
      }
    }

    if (typeof current !== "string") {
      return key;
    }

    let result = current;
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), paramValue);
      });
    }

    return result;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        translations,
        toggleLanguage,
        t,
        isPending,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Return fallback context if used outside provider
    return {
      language: "en" as Language,
      translations: {},
      toggleLanguage: async () => {},
      t: (key: string) => key,
      isPending: false,
    };
  }
  return context;
}
