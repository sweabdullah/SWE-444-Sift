import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import {
  FILTER_REWARD_TYPES,
  buildCardWhere,
  buildUnknownFeeWhere,
  buildUnknownIncomeWhere,
  hasActiveFilters,
  parseFilters,
} from "./filters";

describe("parseFilters — reward types", () => {
  it("reads no filter from an empty query", () => {
    const filters = parseFilters({});
    expect(filters.rewardTypes).toEqual([]);
    expect(hasActiveFilters(filters)).toBe(false);
  });

  it("reads one reward type", () => {
    expect(parseFilters({ reward: "miles" }).rewardTypes).toEqual(["miles"]);
  });

  it("reads several reward types in display order, whatever the URL order", () => {
    expect(parseFilters({ reward: ["miles", "cashback"] }).rewardTypes).toEqual([
      "cashback",
      "miles",
    ]);
  });

  it("ignores unknown values, 'none' and repeats", () => {
    const filters = parseFilters({ reward: ["cashback", "cashback", "none", "gold", ""] });
    expect(filters.rewardTypes).toEqual(["cashback"]);
  });
});

describe("buildCardWhere — reward types", () => {
  it("adds no condition when no reward type is selected", () => {
    expect(buildCardWhere(parseFilters({}))).toEqual({});
  });

  it("matches the card's own type OR any tier's type (a union, not an intersection)", () => {
    expect(buildCardWhere(parseFilters({ reward: ["cashback", "miles"] }))).toEqual({
      AND: [
        {
          OR: [
            { rewardType: { in: ["cashback", "miles"] } },
            { rewardTiers: { some: { rewardType: { in: ["cashback", "miles"] } } } },
          ],
        },
      ],
    });
  });

  it("gives Arabic and English the same buckets (labels only differ)", () => {
    for (const type of FILTER_REWARD_TYPES) {
      expect(en.catalogue.filters.reward[type].trim()).not.toBe("");
      expect(ar.catalogue.filters.reward[type].trim()).not.toBe("");
    }
    expect(Object.keys(en.catalogue.filters.reward).sort()).toEqual(
      [...FILTER_REWARD_TYPES].sort(),
    );
  });
});

describe("parseFilters — annual fee", () => {
  it("reads no fee range from an empty query", () => {
    const filters = parseFilters({});
    expect([filters.feeMin, filters.feeMax]).toEqual([null, null]);
  });

  it("reads a range, and an open-ended bound", () => {
    expect(parseFilters({ feeMin: "100", feeMax: "300" })).toMatchObject({
      feeMin: 100,
      feeMax: 300,
    });
    expect(parseFilters({ feeMax: "250.5" })).toMatchObject({ feeMin: null, feeMax: 250.5 });
  });

  it("keeps 0 as a real bound (free cards), not as 'no filter'", () => {
    const filters = parseFilters({ feeMax: "0" });
    expect(filters.feeMax).toBe(0);
    expect(hasActiveFilters(filters)).toBe(true);
  });

  it("swaps a reversed range", () => {
    expect(parseFilters({ feeMin: "500", feeMax: "100" })).toMatchObject({
      feeMin: 100,
      feeMax: 500,
    });
  });

  it("ignores empty, negative and non-numeric amounts", () => {
    for (const bad of ["", "  ", "-5", "abc", "Infinity"]) {
      expect(parseFilters({ feeMin: bad, feeMax: bad })).toMatchObject({
        feeMin: null,
        feeMax: null,
      });
    }
  });
});

describe("buildCardWhere — annual fee", () => {
  it("keeps only cards whose annual fee is inside the range, bounds included", () => {
    expect(buildCardWhere(parseFilters({ feeMin: "100", feeMax: "300" }))).toEqual({
      AND: [{ fee: { is: { annualFee: { gte: 100, lte: 300 } } } }],
    });
  });

  it("includes free cards when filtering for zero fee", () => {
    expect(buildCardWhere(parseFilters({ feeMax: "0" }))).toEqual({
      AND: [{ fee: { is: { annualFee: { lte: 0 } } } }],
    });
  });

  it("combines with the reward filter (both must hold)", () => {
    const where = buildCardWhere(parseFilters({ reward: "miles", feeMax: "400" }));
    expect(where.AND).toHaveLength(2);
  });
});

describe("buildUnknownFeeWhere", () => {
  it("is null when no fee filter is active", () => {
    expect(buildUnknownFeeWhere(parseFilters({ reward: "cashback" }))).toBeNull();
  });

  it("counts cards with no published annual fee that match every other filter", () => {
    expect(buildUnknownFeeWhere(parseFilters({ reward: "miles", feeMax: "0" }))).toEqual({
      AND: [
        {
          OR: [
            { rewardType: { in: ["miles"] } },
            { rewardTiers: { some: { rewardType: { in: ["miles"] } } } },
          ],
        },
        { OR: [{ fee: { is: null } }, { fee: { is: { annualFee: null } } }] },
      ],
    });
  });
});

describe("parseFilters — minimum income", () => {
  it("reads an income, or none", () => {
    expect(parseFilters({}).income).toBeNull();
    expect(parseFilters({ income: "12000" }).income).toBe(12000);
  });

  it("ignores empty, negative and non-numeric incomes", () => {
    for (const bad of ["", "-1", "lots"]) expect(parseFilters({ income: bad }).income).toBeNull();
  });

  it("counts as an active filter", () => {
    expect(hasActiveFilters(parseFilters({ income: "8000" }))).toBe(true);
  });
});

describe("buildCardWhere — minimum income", () => {
  it("keeps cards whose published minimum income is at or below the visitor's income", () => {
    // `lte` on a nullable column: a NULL (unpublished) minimum never matches, so it is excluded
    // rather than assumed to qualify.
    expect(buildCardWhere(parseFilters({ income: "10000" }))).toEqual({
      AND: [{ minMonthlyIncome: { lte: 10000 } }],
    });
  });
});

describe("buildUnknownIncomeWhere", () => {
  it("is null when no income is set", () => {
    expect(buildUnknownIncomeWhere(parseFilters({ feeMax: "0" }))).toBeNull();
  });

  it("counts cards with no published minimum income that match every other filter", () => {
    expect(buildUnknownIncomeWhere(parseFilters({ income: "5000", feeMax: "0" }))).toEqual({
      AND: [{ fee: { is: { annualFee: { lte: 0 } } } }, { minMonthlyIncome: null }],
    });
  });
});
