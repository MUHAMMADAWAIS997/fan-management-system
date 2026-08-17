"use server";

import { i18nService, Language, TranslationDictionary } from "@/lib/services/i18n.service";
import { ActionResult } from "@/lib/types/auth";
import { revalidatePath } from "next/cache";

export interface I18nPayload {
  language: Language;
  translations: TranslationDictionary;
}

/**
 * Get current system language and its translation dictionary
 */
export async function getLanguageAction(): Promise<ActionResult<I18nPayload>> {
  try {
    const language = i18nService.getLanguage();
    const translations = i18nService.getTranslations(language);

    return {
      success: true,
      data: {
        language,
        translations,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to fetch language settings.",
    };
  }
}

/**
 * Set active language or toggle language when targetLang is omitted
 */
export async function toggleLanguageAction(
  targetLang?: Language
): Promise<ActionResult<I18nPayload>> {
  try {
    let newLang: Language;
    if (targetLang) {
      newLang = i18nService.setLanguage(targetLang);
    } else {
      newLang = i18nService.toggleLanguage();
    }

    const translations = i18nService.getTranslations(newLang);
    revalidatePath("/");

    return {
      success: true,
      message: i18nService.t("messages.language_changed", {
        language: newLang === "ur" ? "Urdu" : "English",
      }, newLang),
      data: {
        language: newLang,
        translations,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to toggle language.",
    };
  }
}

/**
 * Get translations dictionary for specified language
 */
export async function getTranslationsAction(
  lang?: Language
): Promise<ActionResult<TranslationDictionary>> {
  try {
    const translations = i18nService.getTranslations(lang);
    return {
      success: true,
      data: translations,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Failed to load translations.",
    };
  }
}
