import type { Locale } from "@sift/schema";

/**
 * Number locale per UI locale. Arabic uses `ar-SA-u-nu-latn` so digits stay Western (0-9);
 * plain `ar-SA` would output Arabic-Indic digits. English uses `en-SA`.
 */
export const NUMBER_LOCALE: Record<Locale, string> = {
  ar: "ar-SA-u-nu-latn",
  en: "en-SA",
};

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
  const text = formatterFor(locale, options.maximumFractionDigits ?? 2).format(value);
  // Some ICU builds emit U+2212 MINUS SIGN or bidi marks for negatives in Arabic; normalise.
  return text.replace(/[\u200e\u200f\u061c]/g, "").replace(/\u2212/g, "-");
}
