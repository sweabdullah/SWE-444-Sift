import { DEFAULT_LOCALE, LOCALES, directionOf, isLocale, type Locale } from "@sift/schema";

export { DEFAULT_LOCALE, LOCALES, directionOf, isLocale, type Locale };

/** The other locale — used by the language switch. */
export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

/**
 * Minimal placeholder strings for the home page. SFT-10 replaces this with real
 * message catalogs (one per locale) and the i18n library.
 */
export const placeholderCopy = {
  ar: {
    title: "سِفت",
    tagline: "دليل ثنائي اللغة لبطاقات الائتمان في السعودية. قيد الإنشاء.",
    switchLabel: "English",
    logoAlt: "شعار سِفت",
  },
  en: {
    title: "Sift",
    tagline: "A bilingual catalogue of Saudi credit cards. Under construction.",
    switchLabel: "العربية",
    logoAlt: "Sift logo",
  },
} as const satisfies Record<Locale, Record<string, string>>;
