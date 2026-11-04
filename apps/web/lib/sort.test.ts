import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { getTranslator } from "./i18n";
import {
  SORT_ORDERS,
  clearFiltersHref,
  compareCards,
  formatRate,
  parseSort,
  summarizeRewardRate,
  type RateTier,
  type SortableCard,
} from "./sort";

/** A card for the comparator; `id` is carried along so results read as a list of ids. */
type Card = SortableCard & { id: string };

function card(id: string, fields: Partial<SortableCard> = {}): Card {
  return { id, name: id, bankName: "Bank", annualFee: null, rewardRate: null, ...fields };
}

const ids = (cards: Card[]) => cards.map((c) => c.id);

describe("parseSort", () => {
  it("reads the default from an empty query", () => {
    expect(parseSort({})).toBe("default");
  });

  it("reads fee and rate", () => {
    expect(parseSort({ sort: "fee" })).toBe("fee");
    expect(parseSort({ sort: "rate" })).toBe("rate");
  });

  it("falls back to the default for empty, unknown or repeated values", () => {
    expect(parseSort({ sort: "" })).toBe("default");
    expect(parseSort({ sort: "merit" })).toBe("default");
    expect(parseSort({ sort: ["rate", "fee"] })).toBe("rate");
  });
});

describe("clearFiltersHref", () => {
  it("keeps the current sort when filters are cleared", () => {
    expect(clearFiltersHref("en", "fee")).toBe("/en?sort=fee");
    expect(clearFiltersHref("ar", "rate")).toBe("/ar?sort=rate");
  });

  it("links to the bare catalogue for the default order", () => {
    expect(clearFiltersHref("ar", "default")).toBe("/ar");
  });
});

describe("summarizeRewardRate", () => {
  const tier = (fields: Partial<RateTier>): RateTier => ({
    spendingCategory: "general",
    rate: 1,
    rateUnit: "percent",
    minSpend: null,
    ...fields,
  });

  it("returns null when the card has no tiers", () => {
    expect(summarizeRewardRate([])).toBeNull();
  });

  it("uses the general tier with the lowest minimum spend as the base (spend-tiered cashback)", () => {
    // SAB Cashback-style tiers: 0.5% from SAR 500, 1% from 5,000, 2% from 10,000 a month.
    const summary = summarizeRewardRate([
      tier({ rate: 1, minSpend: 5000 }),
      tier({ rate: 0.5, minSpend: 500 }),
      tier({ rate: 2, minSpend: 10000 }),
    ]);
    expect(summary).toEqual({ unit: "percent", max: 2, base: 0.5 });
  });

  it("prefers a general tier with no minimum spend over one with a minimum", () => {
    const summary = summarizeRewardRate([
      tier({ rate: 0.4, minSpend: 1000 }),
      tier({ rate: 0.7, minSpend: null }),
      tier({ spendingCategory: "fuel", rate: 11 }),
    ]);
    expect(summary).toEqual({ unit: "percent", max: 11, base: 0.7 });
  });

  it("uses the lowest rate as the base when there is no general tier", () => {
    const summary = summarizeRewardRate([
      tier({ spendingCategory: "dining", rate: 5 }),
      tier({ spendingCategory: "online", rate: 3 }),
    ]);
    expect(summary).toEqual({ unit: "percent", max: 5, base: 3 });
  });

  it("summarises by percent first, then points, then miles, ignoring the other units", () => {
    const mixed = [
      tier({ rateUnit: "miles_per_sar", rate: 4 }),
      tier({ rateUnit: "points_per_sar", rate: 10 }),
      tier({ rateUnit: "percent", rate: 1.5 }),
    ];
    expect(summarizeRewardRate(mixed)).toEqual({ unit: "percent", max: 1.5, base: 1.5 });
    expect(summarizeRewardRate(mixed.slice(0, 2))).toEqual({
      unit: "points_per_sar",
      max: 10,
      base: 10,
    });
    expect(summarizeRewardRate(mixed.slice(0, 1))).toEqual({
      unit: "miles_per_sar",
      max: 4,
      base: 4,
    });
  });
});

describe("compareCards — default", () => {
  it("sorts by bank name, then card name, ignoring fees and rates", () => {
    const cards = [
      card("b2", { bankName: "B", name: "2", annualFee: 0 }),
      card("a2", { bankName: "A", name: "2" }),
      card("b1", { bankName: "B", name: "1", annualFee: 900 }),
      card("a1", { bankName: "A", name: "1" }),
    ];
    expect(ids(cards.sort(compareCards("default", "en")))).toEqual(["a1", "a2", "b1", "b2"]);
  });
});

describe("compareCards — annual fee", () => {
  it("puts free cards first and cards with an unpublished fee last, never as 0", () => {
    const cards = [
      card("unknown", { bankName: "A" }),
      card("paid", { bankName: "B", annualFee: 350 }),
      card("cheap", { bankName: "C", annualFee: 100 }),
      card("free", { bankName: "D", annualFee: 0 }),
    ];
    expect(ids(cards.sort(compareCards("fee", "en")))).toEqual([
      "free",
      "cheap",
      "paid",
      "unknown",
    ]);
  });

  it("breaks ties alphabetically, among equal fees and among unpublished fees", () => {
    const cards = [
      card("free-b", { bankName: "B", annualFee: 0 }),
      card("unknown-b", { bankName: "B" }),
      card("free-a", { bankName: "A", annualFee: 0 }),
      card("unknown-a", { bankName: "A" }),
    ];
    expect(ids(cards.sort(compareCards("fee", "en")))).toEqual([
      "free-a",
      "free-b",
      "unknown-a",
      "unknown-b",
    ]);
  });
});

describe("compareCards — reward rate", () => {
  const rate = (unit: "percent" | "points_per_sar" | "miles_per_sar", max: number) => ({
    unit,
    max,
    base: max / 2,
  });

  it("groups by unit (percent, points, miles), highest maximum first, unpublished last", () => {
    const cards = [
      card("none", { bankName: "A" }),
      card("miles", { bankName: "A", rewardRate: rate("miles_per_sar", 5) }),
      card("points-1", { bankName: "A", rewardRate: rate("points_per_sar", 1) }),
      card("percent-2", { bankName: "A", rewardRate: rate("percent", 2) }),
      card("points-10", { bankName: "A", rewardRate: rate("points_per_sar", 10) }),
      card("percent-11", { bankName: "A", rewardRate: rate("percent", 11) }),
    ];
    // 10 points per SAR is not "more" than 2% cashback: units never compete with each other.
    expect(ids(cards.sort(compareCards("rate", "en")))).toEqual([
      "percent-11",
      "percent-2",
      "points-10",
      "points-1",
      "miles",
      "none",
    ]);
  });

  it("ranks by the maximum rate, not the base", () => {
    const cards = [
      card("high-base", { rewardRate: { unit: "percent", max: 1.5, base: 1.5 } }),
      card("high-max", { rewardRate: { unit: "percent", max: 2, base: 0.5 } }),
    ];
    expect(ids(cards.sort(compareCards("rate", "en")))).toEqual(["high-max", "high-base"]);
  });

  it("breaks ties alphabetically", () => {
    const cards = [
      card("b", { bankName: "B", rewardRate: rate("percent", 1) }),
      card("none-b", { bankName: "B" }),
      card("a", { bankName: "A", rewardRate: rate("percent", 1) }),
      card("none-a", { bankName: "A" }),
    ];
    expect(ids(cards.sort(compareCards("rate", "en")))).toEqual(["a", "b", "none-a", "none-b"]);
  });
});

describe("formatRate", () => {
  it("writes each unit in both locales with at most two decimals and Western digits", () => {
    const tEn = getTranslator("en");
    const tAr = getTranslator("ar");
    expect(formatRate(tEn, "en", "percent", 2)).toBe("2%");
    expect(formatRate(tEn, "en", "points_per_sar", 1)).toBe("1 pt / SAR");
    expect(formatRate(tEn, "en", "miles_per_sar", 0.3333)).toBe("0.33 miles / SAR");
    expect(formatRate(tAr, "ar", "percent", 0.5)).toBe("0.5%");
    expect(formatRate(tAr, "ar", "miles_per_sar", 0.3333)).toBe("0.33 ميل / ريال");
  });

  it("states the max and base together on a row", () => {
    const t = getTranslator("en");
    expect(
      t("catalogue.rate.upToBase", {
        max: formatRate(t, "en", "percent", 2),
        base: formatRate(t, "en", "percent", 0.5),
      }),
    ).toBe("Up to 2% · Base 0.5%");
  });
});

describe("sort messages", () => {
  it("has a label and a note stating the rule for every sort order, in both locales", () => {
    for (const order of SORT_ORDERS) {
      for (const messages of [en, ar]) {
        expect(messages.catalogue.sort[order].trim()).not.toBe("");
        expect(messages.catalogue.sortNote[order].trim()).not.toBe("");
      }
    }
  });
});
