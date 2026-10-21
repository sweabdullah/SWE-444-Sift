import { describe, expect, it } from "vitest";
import { CardFiltersSchema, DEFAULT_PAGE_SIZE } from "../src/index.js";

describe("CardFiltersSchema", () => {
  it("applies defaults", () => {
    expect(CardFiltersSchema.parse({})).toEqual({
      locale: "ar",
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it("parses URL search-param strings", () => {
    const f = CardFiltersSchema.parse({
      rewardTypes: "cashback,miles",
      maxAnnualFee: "0",
      income: "8000",
      shariaOnly: "true",
      q: "  platinum ",
      sort: "annual_fee_asc",
      locale: "en",
      page: "2",
    });
    expect(f).toMatchObject({
      rewardTypes: ["cashback", "miles"],
      maxAnnualFee: 0,
      income: 8000,
      shariaOnly: true,
      q: "platinum",
      sort: "annual_fee_asc",
      locale: "en",
      page: 2,
    });
  });

  it("treats empty strings as unset, not as 0", () => {
    const f = CardFiltersSchema.parse({ maxAnnualFee: "", income: "", sort: "" });
    expect(f.maxAnnualFee).toBeUndefined();
    expect(f.income).toBeUndefined();
    expect(f.sort).toBeUndefined();
  });

  it("rejects unknown enum values, bad numbers and oversized pages", () => {
    expect(CardFiltersSchema.safeParse({ rewardTypes: ["gold"] }).success).toBe(false);
    expect(CardFiltersSchema.safeParse({ maxAnnualFee: "abc" }).success).toBe(false);
    expect(CardFiltersSchema.safeParse({ maxAnnualFee: -5 }).success).toBe(false);
    expect(CardFiltersSchema.safeParse({ pageSize: 1000 }).success).toBe(false);
    expect(CardFiltersSchema.safeParse({ sort: "best" }).success).toBe(false);
  });
});
