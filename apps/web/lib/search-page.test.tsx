import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCardWhere, parseFilters } from "./filters";
import { buildSearchWhere } from "./search";

const db = vi.hoisted(() => ({
  findPublishedCardNames: vi.fn(),
  findPublishedCardsForList: vi.fn(),
  countPublishedCards: vi.fn(),
}));
vi.mock("@sift/db", () => db);
vi.mock("@/components/LocaleSwitch", () => ({ LocaleSwitch: () => null }));
import HomePage from "../app/[locale]/page";

const bank = {
  nameEn: "Riyad Bank",
  nameAr: "بنك الرِّيَاض",
  entryUrls: [{ url: "https://bank.example/" }],
};
const rows = Array.from({ length: 8 }, (_, i) => ({
  id: `card-${i}`,
  bank,
  source: { url: `https://bank.example/cards/${i}` },
  verifiedAt: new Date("2026-10-21T09:00:00Z"),
  translations: [{ name: `Gold ${i}` }],
  rewardType: "cashback" as const,
  fee: { annualFee: String(80 - i * 10) },
  rewardTiers: [
    {
      spendingCategory: "general",
      rate: String(i + 1),
      rateUnit: "percent" as const,
      minSpend: null,
    },
  ],
}));

describe("catalogue search page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.findPublishedCardNames.mockResolvedValue(rows);
    db.findPublishedCardsForList.mockResolvedValue(rows);
    db.countPublishedCards.mockResolvedValue(0);
  });

  it.each([
    ["en", "default"],
    ["en", "fee"],
    ["en", "rate"],
    ["ar", "default"],
    ["ar", "fee"],
    ["ar", "rate"],
  ] as const)(
    "searches before sorting and pagination in %s with %s sort and keeps search in page links",
    async (locale, sort) => {
      const query = {
        q: "الرياض",
        reward: "cashback",
        feeMax: "100",
        income: "10000",
        sharia: "1",
        sort,
        page: "2",
      };
      const html = renderToStaticMarkup(
        await HomePage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve(query),
        }),
      );
      const filters = parseFilters(query);
      const search = buildSearchWhere(rows, filters.search);
      expect(db.findPublishedCardsForList).toHaveBeenCalledWith(
        locale,
        buildCardWhere(filters, search),
      );
      expect(db.countPublishedCards).toHaveBeenCalledTimes(3);
      for (const [where] of db.countPublishedCards.mock.calls) {
        expect(where.AND).toContainEqual(search);
      }
      // Sorting must happen across all eight matches before taking the second six-card page.
      const [first, second, absent] =
        sort === "default" ? ["Gold 6", "Gold 7", "Gold 0"] : ["Gold 1", "Gold 0", "Gold 7"];
      expect(html).toContain(first);
      expect(html).toContain(second);
      expect(html).not.toContain(absent);
      expect(html.indexOf(first)).toBeLessThan(html.indexOf(second));
      expect(html).toContain(`href="https://bank.example/cards/${first.split(" ")[1]}"`);
      expect(html).toContain(`href="https://bank.example/cards/${second.split(" ")[1]}"`);
      expect(html).not.toContain(`href="https://bank.example/cards/${absent.split(" ")[1]}"`);
      expect(html.match(/datetime="2026-10-21T09:00:00.000Z"/gi)).toHaveLength(2);
      expect(html).toContain("q=%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6");
    },
  );

  it.each(["", "  ", "\u064E\u0651"])("skips the name lookup for a blank query: %s", async (q) => {
    await HomePage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ q }),
    });
    expect(db.findPublishedCardNames).not.toHaveBeenCalled();
    expect(db.findPublishedCardsForList).toHaveBeenCalledWith("en", {});
  });

  it("keeps an empty match set restrictive and shows the existing no-match state", async () => {
    db.findPublishedCardsForList.mockResolvedValue([]);
    const html = renderToStaticMarkup(
      await HomePage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({ q: "missing" }),
      }),
    );
    expect(db.findPublishedCardsForList).toHaveBeenCalledWith("en", { AND: [{ id: { in: [] } }] });
    expect(html).toContain("No cards match these filters.");
  });
});
