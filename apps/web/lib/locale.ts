import { DEFAULT_LOCALE, LOCALES, directionOf, isLocale, type Locale } from "@sift/schema";

/**
 * Locale helpers that are safe in client components: this module must never import the
 * message catalogues (messages/*.json), so they stay out of the browser bundle.
 * Translations live in lib/i18n.ts (server-side use).
 */
export { DEFAULT_LOCALE, LOCALES, directionOf, isLocale, type Locale };

/** The other locale — used by the language switch. */
export function otherLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

/**
 * The same page in another locale: swaps the leading /ar or /en segment, keeps the rest of
 * the path and the query string, so switching language never sends the visitor back home
 * or drops their filters.
 */
export function localizedPath(pathname: string, target: Locale, search = ""): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0] ?? "")) segments.shift();
  const query =
    search === "" || search === "?" ? "" : search.startsWith("?") ? search : `?${search}`;
  return `/${[target, ...segments].join("/")}${query}`;
}
