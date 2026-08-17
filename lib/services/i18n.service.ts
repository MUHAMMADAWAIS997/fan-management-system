import db from "@/lib/db";
import fs from "fs";
import path from "path";

export type Language = "en" | "ur";

export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}

export const SETTINGS_KEY_LANGUAGE = "app_language";
export const DEFAULT_LANGUAGE: Language = "en";

export class I18nService {
  private translationsCache: Record<Language, TranslationDictionary | null> = {
    en: null,
    ur: null,
  };

  /**
   * Get the active system language from SQLite settings.
   * Defaults to 'en' if not set or invalid.
   */
  public getLanguage(): Language {
    try {
      const stmt = db.prepare<[string], { value: string }>(
        "SELECT value FROM system_settings WHERE key = ?"
      );
      const row = stmt.get(SETTINGS_KEY_LANGUAGE);
      if (row && (row.value === "en" || row.value === "ur")) {
        return row.value as Language;
      }
    } catch (err) {
      console.warn("[I18nService] Failed to read language from DB:", err);
    }
    return DEFAULT_LANGUAGE;
  }

  /**
   * Set and persist the active language in SQLite settings.
   */
  public setLanguage(lang: Language): Language {
    const targetLang: Language = lang === "ur" ? "ur" : "en";
    try {
      const stmt = db.prepare(
        "INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
      );
      stmt.run(SETTINGS_KEY_LANGUAGE, targetLang);
    } catch (err) {
      console.error("[I18nService] Failed to persist language to DB:", err);
    }
    return targetLang;
  }

  /**
   * Toggle between 'en' and 'ur' languages and return the new language.
   */
  public toggleLanguage(): Language {
    const current = this.getLanguage();
    const nextLang: Language = current === "en" ? "ur" : "en";
    return this.setLanguage(nextLang);
  }

  /**
   * Clear in-memory translations cache.
   */
  public clearCache(): void {
    this.translationsCache = { en: null, ur: null };
  }

  /**
   * Get full translation dictionary for a specific language or current active language.
   */
  public getTranslations(lang?: Language): TranslationDictionary {
    const targetLang = lang || this.getLanguage();

    if (process.env.NODE_ENV !== "production") {
      this.translationsCache[targetLang] = null;
    }

    if (this.translationsCache[targetLang]) {
      return this.translationsCache[targetLang]!;
    }

    try {
      const filename = targetLang === "ur" ? "urdu.json" : "english.json";
      const filePath = path.join(process.cwd(), "i18n", filename);

      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(fileContent);
        this.translationsCache[targetLang] = parsed;
        return parsed;
      }
    } catch (err) {
      console.error(`[I18nService] Failed to load translations for ${targetLang}:`, err);
    }

    return {};
  }

  /**
   * Translate a dot-notated key (e.g. 'dashboard.title') with optional params interpolation.
   */
  public t(key: string, params?: Record<string, string>, lang?: Language): string {
    const dict = this.getTranslations(lang);
    const keys = key.split(".");
    let current: any = dict;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        // Key not found in target dict; fallback to key itself
        current = undefined;
        break;
      }
    }

    // Fallback to English if target lang failed and wasn't English
    const activeLang = lang || this.getLanguage();
    if (current === undefined && activeLang !== "en") {
      const enDict = this.getTranslations("en");
      let enCurrent: any = enDict;
      for (const k of keys) {
        if (enCurrent && typeof enCurrent === "object" && k in enCurrent) {
          enCurrent = enCurrent[k];
        } else {
          enCurrent = undefined;
          break;
        }
      }
      if (typeof enCurrent === "string") {
        current = enCurrent;
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
  }
}

export const i18nService = new I18nService();
export default i18nService;
