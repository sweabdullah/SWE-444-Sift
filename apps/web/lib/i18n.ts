import type { Locale } from "./locale";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { formatNumber } from "./format";

// Client components must import these from "@/lib/locale" instead: importing this module
// bundles both message catalogues.
export {
  DEFAULT_LOCALE,
  LOCALES,
  directionOf,
  isLocale,
  localizedPath,
  otherLocale,
  type Locale,
} from "./locale";

/**
 * Message catalogues. Arabic is the source of truth for the shape: `Messages` is derived from
 * ar.json, and en.json must match it (the type below catches missing keys at build time;
 * lib/i18n.test.ts also catches extra keys).
 *
 * Why not an i18n library (e.g. next-intl): ICU messages format `{n, number}` / plural `#`
 * with the bare request locale, so whether Arabic gets Western digits depends on the runtime's
 * CLDR data. Sift needs Western digits guaranteed, so every number goes through
 * lib/format.ts instead. The catalogue is small and fully typed without a dependency.
 */
export type Messages = typeof ar;

const catalogues: Record<Locale, Messages> = { ar, en };

/** Dotted paths to every string leaf, e.g. "home.title". */
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;

/** Values for `{name}` placeholders. Numbers are formatted with Western digits. */
export type MessageValues = Record<string, string | number>;

export type Translator = (key: MessageKey, values?: MessageValues) => string;

export function getMessages(locale: Locale): Messages {
  return catalogues[locale];
}

function lookup(messages: Messages, key: string): string {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    node =
      typeof node === "object" && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof node !== "string") throw new Error(`Missing message "${key}"`);
  return node;
}

/**
 * Typed translator for one locale. Use it in server components and pass the resulting strings
 * to client components as props; importing this module from a client component would ship
 * both catalogues to the browser. `{name}` placeholders are replaced from `values`; unknown placeholders are
 * left as-is so a missing value is visible rather than silently blank.
 */
export function getTranslator(locale: Locale): Translator {
  const messages = catalogues[locale];
  return (key, values) => interpolate(lookup(messages, key), locale, values);
}

/** Replace `{name}` placeholders; numbers go through formatNumber (Western digits). */
export function interpolate(template: string, locale: Locale, values?: MessageValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    if (value === undefined) return match;
    return typeof value === "number" ? formatNumber(value, locale) : value;
  });
}
