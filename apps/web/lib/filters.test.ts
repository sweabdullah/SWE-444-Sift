import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { FILTER_REWARD_TYPES, buildCardWhere, hasActiveFilters, parseFilters } from "./filters";

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
