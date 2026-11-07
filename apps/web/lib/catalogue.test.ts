import { describe, expect, it } from "vitest";
import { cardHref, toCardList, type CardListRow } from "./catalogue";

const decimal = (s: string) => ({ toString: () => s });

const sab: CardListRow = {
  id: "card_sab",
  rewardType: "cashback",
  bank: {
    nameAr: "البنك السعودي الأول",
    nameEn: "Saudi Awwal Bank (SAB)",
    entryUrls: [{ url: "https://www.sab.com/" }],
  },
  source: { url: "https://www.sab.com/cards/test" },
  verifiedAt: new Date("2026-10-21T09:00:00Z"),
  fee: { annualFee: decimal("350.00") },
  translations: [{ name: "SAB Cashback" }],
  rewardTiers: [],
};

const rows: CardListRow[] = [
  sab,
  {
    id: "card_riyad_b",
    rewardType: "points",
    bank: {
      nameAr: "بنك الرياض",
      nameEn: "Riyad Bank",
      entryUrls: [{ url: "https://www.riyadbank.com/" }],
    },
    source: { url: "https://www.riyadbank.com/cards/test" },
    verifiedAt: null,
    fee: { annualFee: decimal("0.00") },
    translations: [{ name: "Titanium" }],
    rewardTiers: [],
  },
  {
    id: "card_riyad_a",
    rewardType: "none",
    bank: {
      nameAr: "بنك الرياض",
      nameEn: "Riyad Bank",
      entryUrls: [{ url: "https://www.riyadbank.com/" }],
    },
    source: { url: "https://www.riyadbank.com/cards/test" },
    verifiedAt: null,
    fee: null,
    translations: [{ name: "Cashback Signature" }],
    rewardTiers: [],
  },
];

describe("toCardList", () => {
  it("carries actual provenance through without filling in missing dates", () => {
    const byId = new Map(toCardList(rows, "en").map((c) => [c.id, c]));
    expect(byId.get("card_sab")?.sourceUrl).toBe(sab.source.url);
    expect(byId.get("card_sab")?.verifiedAt).toBe(sab.verifiedAt);
    expect(byId.get("card_riyad_a")?.verifiedAt).toBeNull();
  });
  it("sorts by bank name, then card name, in the locale's alphabet", () => {
    expect(toCardList(rows, "en").map((c) => c.id)).toEqual([
      "card_riyad_a",
      "card_riyad_b",
      "card_sab",
    ]);
    // Arabic: "البنك…" sorts before "بنك…".
    expect(toCardList(rows, "ar").map((c) => c.id)).toEqual([
      "card_sab",
      "card_riyad_a",
      "card_riyad_b",
    ]);
  });

  it("uses the bank name of the requested locale", () => {
    expect(toCardList(rows, "ar").find((c) => c.id === "card_sab")?.bankName).toBe(
      "البنك السعودي الأول",
    );
    expect(toCardList(rows, "en").find((c) => c.id === "card_sab")?.bankName).toBe(
      "Saudi Awwal Bank (SAB)",
    );
  });

  it("keeps a published zero fee as 0 and an unpublished fee as null", () => {
    const byId = new Map(toCardList(rows, "en").map((c) => [c.id, c]));
    expect(byId.get("card_riyad_b")?.annualFee).toBe(0);
    expect(byId.get("card_riyad_a")?.annualFee).toBeNull();
    expect(byId.get("card_sab")?.annualFee).toBe(350);
  });

  it("leaves out a card with no name in this locale instead of showing another language", () => {
    const missing: CardListRow = { ...sab, id: "card_untranslated", translations: [] };
    expect(toCardList([missing], "ar")).toEqual([]);
  });

  it("reads the reward tiers' Decimals into a max and base rate, or null with no tiers", () => {
    const tiered: CardListRow = {
      ...sab,
      rewardTiers: [
        {
          spendingCategory: "general",
          rate: decimal("0.5000"),
          rateUnit: "percent",
          minSpend: decimal("500.00"),
        },
        {
          spendingCategory: "general",
          rate: decimal("2.0000"),
          rateUnit: "percent",
          minSpend: decimal("10000.00"),
        },
      ],
    };
    expect(toCardList([tiered], "en")[0]?.rewardRate).toEqual({
      unit: "percent",
      max: 2,
      base: 0.5,
    });
    expect(toCardList([sab], "en")[0]?.rewardRate).toBeNull();
  });

  it("applies the requested sort: by fee, the free card first and the unpublished fee last", () => {
    expect(toCardList(rows, "en", "fee").map((c) => c.id)).toEqual([
      "card_riyad_b",
      "card_sab",
      "card_riyad_a",
    ]);
  });
  it("carries each card's main reward type as its headline reward", () => {
    const byId = new Map(toCardList(rows, "en").map((c) => [c.id, c.rewardType]));
    expect(byId.get("card_sab")).toBe("cashback");
    expect(byId.get("card_riyad_b")).toBe("points");
    expect(byId.get("card_riyad_a")).toBe("none");
  });
});

describe("cardHref", () => {
  it("points at the detail page in the same locale", () => {
    expect(cardHref("ar", "card_sab")).toBe("/ar/cards/card_sab");
    expect(cardHref("en", "card_sab")).toBe("/en/cards/card_sab");
  });

  it("escapes characters that are not safe in a path segment", () => {
    expect(cardHref("en", "a/b c")).toBe("/en/cards/a%2Fb%20c");
  });
});
