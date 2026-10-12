/**
 * @sift/schema — shared domain definitions.
 *
 * Anything both the web app and the ingestion worker need to agree on lives here,
 * defined once. The extraction schema (Zod) will be added in Sprint 7 (S-44 / K-12).
 */

/** The two locales Sift ships in. Arabic is listed first: it is not a translation of English. */
export const LOCALES = ["ar", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

/** Text direction for a locale — used to set `dir` on <html>. */
export function directionOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
