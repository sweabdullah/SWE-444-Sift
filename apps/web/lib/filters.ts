// Type-only imports: this module and its tests never load the Prisma client.
import type { Prisma, RewardType } from "@sift/db";

/**
 * The reward types a visitor can filter by, in display order. One list for both locales: the
 * labels come from `catalogue.filters.reward.<type>` in each message catalogue, so Arabic and
 * English always offer the same buckets and return the same cards. `none` is not a filter.
 */
export const FILTER_REWARD_TYPES = [
  "cashback",
  "points",
  "miles",
] as const satisfies readonly RewardType[];

export type FilterRewardType = (typeof FILTER_REWARD_TYPES)[number];

/** The catalogue filters, read from the URL query string so a filtered view can be bookmarked. */
export interface CatalogueFilters {
  /** Reward types to show. Empty = no reward filter. Several = a union (any of them). */
  rewardTypes: FilterRewardType[];
}

/** Query parameter names. */
export const FILTER_PARAMS = {
  reward: "reward",
} as const;

export type SearchParams = Record<string, string | string[] | undefined>;

function valuesOf(params: SearchParams, name: string): string[] {
  const value = params[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function isFilterRewardType(value: string): value is FilterRewardType {
  return (FILTER_REWARD_TYPES as readonly string[]).includes(value);
}

/**
 * Read the filters from the query string. Anything unrecognised is ignored rather than rejected,
 * so an old or hand-edited link still shows the catalogue.
 */
export function parseFilters(params: SearchParams): CatalogueFilters {
  const selected = new Set(valuesOf(params, FILTER_PARAMS.reward).filter(isFilterRewardType));
  return {
    // Keep the display order, whatever order the URL lists them in.
    rewardTypes: FILTER_REWARD_TYPES.filter((type) => selected.has(type)),
  };
}

/** True when at least one filter narrows the catalogue. */
export function hasActiveFilters(filters: CatalogueFilters): boolean {
  return filters.rewardTypes.length > 0;
}

/**
 * The database condition for the filters (combined with `status = published` by the query).
 *
 * Reward types are a union: a card matches if its main reward type, or the type of any of its
 * reward tiers, is one of the selected types. So a card offering cashback and points appears
 * under Cashback and under Points.
 */
export function buildCardWhere(filters: CatalogueFilters): Prisma.CardWhereInput {
  const and: Prisma.CardWhereInput[] = [];

  if (filters.rewardTypes.length > 0) {
    const types = filters.rewardTypes;
    and.push({
      OR: [{ rewardType: { in: types } }, { rewardTiers: { some: { rewardType: { in: types } } } }],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}
