import type { Locale } from "@sift/schema";

/**
 * Number locale per UI locale. Arabic uses `ar-SA-u-nu-latn` so digits stay Western (0-9);
 * plain `ar-SA` would output Arabic-Indic digits. English uses `en-SA`.
 */
export const NUMBER_LOCALE: Record<Locale, string> = {
  ar: "ar-SA-u-nu-latn",
  en: "en-SA",
};

/**
 * Date locale per UI locale. Plain `ar-SA` defaults to the Umm al-Qura (Hijri) calendar and
 * Arabic-Indic digits; Sift shows Gregorian dates with Western digits in both languages.
 */
export const DATE_LOCALE: Record<Locale, string> = {
  ar: "ar-SA-u-ca-gregory-nu-latn",
  en: "en-SA-u-ca-gregory-nu-latn",
};

/** Dates are shown in Saudi time so server and browser render the same day. */
export const TIME_ZONE = "Asia/Riyadh";

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(locale: Locale, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${locale}:${maximumFractionDigits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(NUMBER_LOCALE[locale], {
      numberingSystem: "latn",
      maximumFractionDigits,
      minimumFractionDigits: 0,
    });
    formatters.set(key, f);
  }
  return f;
}

/**
 * Format a Saudi riyal amount as a plain number string (Western digits, no currency text).
 * The riyal symbol itself is drawn by <Riyal>, never written as "SAR" or "ريال".
 * Negative values keep an ASCII hyphen-minus so `⃁ -250` reads the same in both locales.
 */
export function formatSAR(
  value: number,
  locale: Locale,
  options: { maximumFractionDigits?: number } = {},
): string {
  return clean(formatterFor(locale, options.maximumFractionDigits ?? 2).format(value));
}

/**
 * Some ICU builds emit bidi marks or U+2212 MINUS SIGN in Arabic output; strip and normalise
 * so numbers read the same in both locales.
 */
function clean(text: string): string {
  return text.replace(/[\u200e\u200f\u061c]/g, "").replace(/\u2212/g, "-");
}

/**
 * Format any number for display (counts, percentages' numeric part, years in copy).
 * Always Western digits. Use this — never `toLocaleString()` or a bare `Intl.NumberFormat`.
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options: Omit<Intl.NumberFormatOptions, "numberingSystem"> = {},
): string {
  return clean(
    new Intl.NumberFormat(NUMBER_LOCALE[locale], { ...options, numberingSystem: "latn" }).format(
      value,
    ),
  );
}

/**
 * Format a date for display: Gregorian calendar, Western digits, Asia/Riyadh.
 * Defaults to a long date, e.g. "3 أكتوبر 2026" / "October 3, 2026".
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale,
  options: Omit<Intl.DateTimeFormatOptions, "calendar" | "numberingSystem"> = {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
): string {
  return clean(
    new Intl.DateTimeFormat(DATE_LOCALE[locale], {
      timeZone: TIME_ZONE,
      ...options,
      calendar: "gregory",
      numberingSystem: "latn",
    }).format(new Date(date)),
  );
}
