import { I18nService } from "@/lib/services/i18n.service";

// Mock the database
jest.mock("@/lib/db", () => {
  const store = new Map<string, string>();
  return {
    prepare: jest.fn((sql: string) => {
      if (sql.includes("SELECT value FROM system_settings")) {
        return {
          get: jest.fn((key: string) => {
            const val = store.get(key);
            return val ? { value: val } : undefined;
          }),
        };
      }
      if (sql.includes("system_settings")) {
        return {
          run: jest.fn((key: string, value: string) => {
            store.set(key, value);
            return { changes: 1 };
          }),
        };
      }
      return {
        get: jest.fn(),
        run: jest.fn(),
      };
    }),
  };
});

describe("I18nService", () => {
  let service: I18nService;

  beforeEach(() => {
    service = new I18nService();
  });

  describe("getLanguage() & setLanguage()", () => {
    it("should return default language 'en' when DB key is not present", () => {
      expect(service.getLanguage()).toBe("en");
    });

    it("should update language to 'ur' and persist in DB", () => {
      const res = service.setLanguage("ur");
      expect(res).toBe("ur");
      expect(service.getLanguage()).toBe("ur");
    });

    it("should toggle language between 'en' and 'ur'", () => {
      service.setLanguage("en");
      expect(service.toggleLanguage()).toBe("ur");
      expect(service.getLanguage()).toBe("ur");
      expect(service.toggleLanguage()).toBe("en");
      expect(service.getLanguage()).toBe("en");
    });
  });

  describe("getTranslations()", () => {
    it("should load english translations dictionary", () => {
      const dict = service.getTranslations("en");
      expect(dict).toBeDefined();
      expect(dict.app).toBeDefined();
    });

    it("should load urdu translations dictionary", () => {
      const dict = service.getTranslations("ur");
      expect(dict).toBeDefined();
      expect(dict.app).toBeDefined();
    });
  });

  describe("t() translation lookup", () => {
    it("should translate nested keys for English", () => {
      expect(service.t("app.dashboard", undefined, "en")).toBe("Dashboard");
      expect(service.t("common.save", undefined, "en")).toBe("Save");
    });

    it("should translate nested keys for Urdu", () => {
      expect(service.t("app.dashboard", undefined, "ur")).toBe("ڈیش بورڈ");
      expect(service.t("common.save", undefined, "ur")).toBe("محفوظ کریں");
    });

    it("should interpolate parameters correctly", () => {
      const res = service.t("messages.language_changed", { language: "Urdu" }, "en");
      expect(res).toBe("Language changed successfully to Urdu.");
    });

    it("should return the key if key is missing in translation dictionaries", () => {
      expect(service.t("non.existent.key", undefined, "en")).toBe("non.existent.key");
    });
  });
});
