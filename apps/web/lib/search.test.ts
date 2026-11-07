import { describe, expect, it } from "vitest";
import {
  buildCardWhere,
  buildUnknownFeeWhere,
  buildUnknownIncomeWhere,
  buildUnknownShariaWhere,
  hasActiveFilters,
  parseFilters,
} from "./filters";
import { localizedPath } from "./locale";
import { pageHref } from "./pagination";
import { buildSearchWhere, normalizeSearch } from "./search";

const bank = { nameEn: "Riyad Bank", nameAr: "بَنْك الرِّيَاض" };
const cards = [
  { id: "gold", bank, translations: [{ name: "Gold Card" }, { name: "البِطَاقَة الذَّهَبِيَّة" }] },
  { id: "silver", bank, translations: [{ name: "Silver" }, { name: "الفضية" }] },
  {
    id: "other",
    bank: { nameEn: "Other Bank", nameAr: "بنك آخر" },
    translations: [{ name: "Platinum" }, { name: "البلاتينية" }],
  },
];

describe("bilingual name search", () => {
  it.each(["gold", "GoLD", "  old ca  ", "الذهبية", "الذَّهَبِيَّة", "ذَهَبِيَّة"])(
    "matches partial card names: %s",
    (q) => expect(buildSearchWhere(cards, q)).toEqual({ id: { in: ["gold"] } }),
  );

  it.each(["RIYAD", "riyad bank", "الرياض", "الرِّيَاض", "بنك الرياض"])(
    "returns every card from a matching bank: %s",
    (q) => expect(buildSearchWhere(cards, q)).toEqual({ id: { in: ["gold", "silver"] } }),
  );

  it("normalizes both content and query, including decomposed Arabic and Quranic marks", () => {
    expect(normalizeSearch("آخَر".normalize("NFD"))).toBe("آخر");
    expect(normalizeSearch("ب\u0610ن\u0670ك\u06D6")).toBe("بنك");
    expect(buildSearchWhere(cards, "فِضِّيَّة")).toEqual({ id: { in: ["silver"] } });
  });

  it("ignores extended Arabic diacritics in both stored names and queries", () => {
    const marked = [{ id: "gold", bank, translations: [{ name: "ذ\u08F0ه\u0899بية" }] }];
    expect(buildSearchWhere(marked, "ذهبية")).toEqual({ id: { in: ["gold"] } });
    expect(buildSearchWhere(cards, "ذ\u08F0ه\u0899بية")).toEqual({ id: { in: ["gold"] } });
    // Keep non-Arabic accents and Arabic letters, including canonically composed hamza.
    expect(normalizeSearch("Café أَ".normalize("NFD"))).toBe("café أ");
  });

  it.each(["", "  ", "\u064E\u0651"])("treats blank/marks-only queries as no search: %s", (q) => {
    expect(buildSearchWhere(cards, q)).toEqual({});
    expect(hasActiveFilters(parseFilters({ q }))).toBe(false);
  });

  it("matches literal text and returns no matches safely", () => {
    for (const q of ["missing", "%", "_", ".*"]) {
      expect(buildSearchWhere(cards, q)).toEqual({ id: { in: [] } });
    }
  });

  it("reads and trims the first q parameter and counts search as active", () => {
    expect(parseFilters({ q: ["  Gold  ", "Silver"] }).search).toBe("Gold");
    expect(parseFilters({}).search).toBe("");
    expect(hasActiveFilters(parseFilters({ q: "gold" }))).toBe(true);
  });

  it("ANDs search with every existing filter, including unknown-value counts", () => {
    const filters = parseFilters({
      q: "riyad",
      reward: "cashback",
      feeMin: "0",
      feeMax: "500",
      income: "10000",
      sharia: "1",
    });
    const search = buildSearchWhere(cards, filters.search);
    expect(buildCardWhere(filters, search)).toEqual({
      AND: [
        search,
        {
          OR: [
            { rewardType: { in: ["cashback"] } },
            { rewardTiers: { some: { rewardType: { in: ["cashback"] } } } },
          ],
        },
        { fee: { is: { annualFee: { gte: 0, lte: 500 } } } },
        { minMonthlyIncome: { lte: 10000 } },
        { shariaCompliant: true },
      ],
    });
    for (const build of [buildUnknownFeeWhere, buildUnknownIncomeWhere, buildUnknownShariaWhere]) {
      expect(build(filters, search)?.AND).toContainEqual(search);
    }
  });

  it.each(["en", "ar"] as const)(
    "preserves search, all filters and sort through %s page/language links",
    (locale) => {
      const params = {
        q: "الرِّيَاض",
        reward: ["cashback", "miles"],
        feeMin: "0",
        feeMax: "500",
        income: "10000",
        sharia: "1",
        sort: "rate",
        page: "3",
      };
      const target = locale === "en" ? "ar" : "en";
      const page = new URL(pageHref(locale, params, 2), "https://sift.test");
      const switched = new URL(localizedPath(page.pathname, target, page.search), page);
      expect(switched.pathname).toBe(`/${target}`);
      for (const [key, value] of Object.entries(params)) {
        expect(switched.searchParams.getAll(key)).toEqual(
          key === "page" ? ["2"] : Array.isArray(value) ? value : [value],
        );
      }
    },
  );
});
