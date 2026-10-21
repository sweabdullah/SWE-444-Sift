import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import {
  LOCALES,
  getMessages,
  getTranslator,
  interpolate,
  localizedPath,
  type MessageKey,
} from "./i18n";

/** Every dotted leaf path in a catalogue, sorted. */
function keysOf(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (typeof node !== "object" || node === null) throw new Error(`Bad node at "${prefix}"`);
  return Object.entries(node)
    .flatMap(([k, v]) => keysOf(v, prefix ? `${prefix}.${k}` : k))
    .sort();
}

function stringsOf(node: unknown): string[] {
  if (typeof node === "string") return [node];
  return Object.values(node as Record<string, unknown>).flatMap(stringsOf);
}

describe("message catalogues", () => {
  it("ar.json and en.json have exactly the same keys", () => {
    expect(keysOf(en)).toEqual(keysOf(ar));
  });

  it("has no empty strings", () => {
    for (const locale of LOCALES) {
      for (const s of stringsOf(getMessages(locale))) expect(s.trim()).not.toBe("");
    }
  });

  it("uses the same {placeholders} in both languages", () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const arT = getTranslator("ar");
    const enT = getTranslator("en");
    for (const key of keysOf(ar) as MessageKey[]) {
      expect(placeholders(enT(key)), key).toEqual(placeholders(arT(key)));
    }
  });

  it("never ranks or recommends a card (brand voice ban list)", () => {
    const banned =
      /\bbest\b|top pick|recommended|don't miss|أفضل|اختيارنا|ننصح|موصى|لا تفوّت|لا تفوت/i;
    for (const locale of LOCALES) {
      for (const s of stringsOf(getMessages(locale))) expect(s).not.toMatch(banned);
    }
  });
});

describe("getTranslator", () => {
  it("returns the string for the locale", () => {
    expect(getTranslator("ar")("home.title")).toBe("سِفت");
    expect(getTranslator("en")("home.title")).toBe("Sift");
  });

  it("interpolates values, formatting numbers with Western digits in Arabic", () => {
    const text = interpolate("{count} بطاقة من {bank}", "ar", { count: 12500, bank: "الراجحي" });
    expect(text).toBe("12,500 بطاقة من الراجحي");
    expect(text).not.toMatch(/[٠-٩]/);
    expect(interpolate("{count} cards", "en", { count: 3 })).toBe("3 cards");
    expect(interpolate("{missing} stays", "en", {})).toBe("{missing} stays");
  });

  it("throws on a key that does not exist", () => {
    // @ts-expect-error — the key type rejects unknown keys at compile time too
    expect(() => getTranslator("en")("home.nope")).toThrow(/Missing message/);
  });
});

describe("localizedPath", () => {
  it("swaps only the locale segment, so the visitor stays on the same page", () => {
    expect(localizedPath("/ar", "en")).toBe("/en");
    expect(localizedPath("/ar/cards/alrajhi-signature", "en")).toBe("/en/cards/alrajhi-signature");
    expect(localizedPath("/en/compare", "ar")).toBe("/ar/compare");
  });

  it("adds a locale prefix when the path has none", () => {
    expect(localizedPath("/", "ar")).toBe("/ar");
    expect(localizedPath("/cards", "en")).toBe("/en/cards");
  });
});
