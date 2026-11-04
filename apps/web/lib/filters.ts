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
  /** Lowest annual fee to show, in SAR. `null` = no lower bound. */
  feeMin: number | null;
  /** Highest annual fee to show, in SAR. `null` = no upper bound; `0` = free cards only. */
  feeMax: number | null;
  /** The visitor's monthly income, in SAR: show cards whose minimum is at or below it. */
  income: number | null;
  /** Show only cards the bank publishes as Sharia-compliant. `false` = no Sharia filter. */
  sharia: boolean;
}

/** Query parameter names. */
export const FILTER_PARAMS = {
  reward: "reward",
  feeMin: "feeMin",
  feeMax: "feeMax",
  income: "income",
  sharia: "sharia",
} as const;

export type SearchParams = Record<string, string | string[] | undefined>;

function valuesOf(params: SearchParams, name: string): string[] {
  const value = params[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** The first value of a parameter as a SAR amount: a finite number >= 0, or `null`. */
function amountOf(params: SearchParams, name: string): number | null {
  const raw = valuesOf(params, name)[0]?.trim();
  if (!raw) return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/**
 * The values that switch a yes/no filter on. The form submits "1"; "true" and "on" (a checkbox
 * with no value) are accepted too, so a hand-written link works. Anything else means off.
 */
const ON_VALUES = new Set(["1", "true", "on"]);

/** The first value of a parameter as a switch: on for a recognised "on" value, otherwise off. */
function switchOf(params: SearchParams, name: string): boolean {
  const raw = valuesOf(params, name)[0]?.trim().toLowerCase();
  return raw !== undefined && ON_VALUES.has(raw);
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
  let feeMin = amountOf(params, FILTER_PARAMS.feeMin);
  let feeMax = amountOf(params, FILTER_PARAMS.feeMax);
  // A reversed range ("from 500 to 100") means the same range the other way round.
  if (feeMin !== null && feeMax !== null && feeMin > feeMax) [feeMin, feeMax] = [feeMax, feeMin];
  return {
    // Keep the display order, whatever order the URL lists them in.
    rewardTypes: FILTER_REWARD_TYPES.filter((type) => selected.has(type)),
    feeMin,
    feeMax,
    income: amountOf(params, FILTER_PARAMS.income),
    sharia: switchOf(params, FILTER_PARAMS.sharia),
  };
}

/** True when an annual-fee range is set. */
export function hasFeeFilter(filters: CatalogueFilters): boolean {
  return filters.feeMin !== null || filters.feeMax !== null;
}

/** True when a monthly income is set. */
export function hasIncomeFilter(filters: CatalogueFilters): boolean {
  return filters.income !== null;
}

/** True when the Sharia-compliant filter is on. */
export function hasShariaFilter(filters: CatalogueFilters): boolean {
  return filters.sharia;
}

/** True when at least one filter narrows the catalogue. */
export function hasActiveFilters(filters: CatalogueFilters): boolean {
  return (
    filters.rewardTypes.length > 0 ||
    hasFeeFilter(filters) ||
    hasIncomeFilter(filters) ||
    hasShariaFilter(filters)
  );
}

/** Which filter a condition comes from, so one can be left out (see the build*UnknownWhere). */
type FilterName = "reward" | "fee" | "income" | "sharia";

function conditionsFor(filters: CatalogueFilters, omit?: FilterName): Prisma.CardWhereInput[] {
  const and: Prisma.CardWhereInput[] = [];

  // Reward types are a union: a card matches if its main reward type, or the type of any of its
  // reward tiers, is one of the selected types. So a card offering cashback and points appears
  // under Cashback and under Points.
  if (omit !== "reward" && filters.rewardTypes.length > 0) {
    const types = filters.rewardTypes;
    and.push({
      OR: [{ rewardType: { in: types } }, { rewardTiers: { some: { rewardType: { in: types } } } }],
    });
  }

  // Annual fee inside the range, bounds included. A card whose fee is not published (no fee row,
  // or a NULL annual fee) never satisfies a comparison in SQL, so it is left out, never read as 0.
  if (omit !== "fee" && hasFeeFilter(filters)) {
    const annualFee: Prisma.DecimalNullableFilter = {};
    if (filters.feeMin !== null) annualFee.gte = filters.feeMin;
    if (filters.feeMax !== null) annualFee.lte = filters.feeMax;
    and.push({ fee: { is: { annualFee } } });
  }

  // Published minimum monthly income at or below the visitor's income. A card whose minimum the
  // bank has not published (NULL) fails the comparison in SQL, so it is left out rather than
  // assumed to qualify.
  if (omit !== "income" && filters.income !== null) {
    and.push({ minMonthlyIncome: { lte: filters.income } });
  }

  // Only cards the bank publishes as Sharia-compliant (`true`). A card the bank says is not
  // compliant (`false`) is left out, and so is one where the bank does not say (NULL): it is
  // never guessed to be compliant.
  if (omit !== "sharia" && hasShariaFilter(filters)) {
    and.push({ shariaCompliant: true });
  }

  return and;
}

function toWhere(and: Prisma.CardWhereInput[]): Prisma.CardWhereInput {
  return and.length > 0 ? { AND: and } : {};
}

/** The database condition for the filters (combined with `status = published` by the query). */
export function buildCardWhere(filters: CatalogueFilters): Prisma.CardWhereInput {
  return toWhere(conditionsFor(filters));
}

/**
 * Cards the fee filter hides only because the bank has not published an annual fee: they match
 * every other active filter, but have no fee row or a NULL annual fee. The page shows this count
 * so a visitor knows those cards exist. `null` when no fee filter is active.
 */
export function buildUnknownFeeWhere(filters: CatalogueFilters): Prisma.CardWhereInput | null {
  if (!hasFeeFilter(filters)) return null;
  return toWhere([
    ...conditionsFor(filters, "fee"),
    { OR: [{ fee: { is: null } }, { fee: { is: { annualFee: null } } }] },
  ]);
}

/**
 * Cards the income filter hides only because the bank has not published a minimum income: they
 * match every other active filter, but their minimum income is NULL. `null` when no income is set.
 */
export function buildUnknownIncomeWhere(filters: CatalogueFilters): Prisma.CardWhereInput | null {
  if (!hasIncomeFilter(filters)) return null;
  return toWhere([...conditionsFor(filters, "income"), { minMonthlyIncome: null }]);
}

/**
 * Cards the Sharia filter hides only because the bank does not state whether they are
 * Sharia-compliant: they match every other active filter, but `shariaCompliant` is NULL. Cards the
 * bank says are not compliant (`false`) are not counted. `null` when the Sharia filter is off.
 */
export function buildUnknownShariaWhere(filters: CatalogueFilters): Prisma.CardWhereInput | null {
  if (!hasShariaFilter(filters)) return null;
  return toWhere([...conditionsFor(filters, "sharia"), { shariaCompliant: null }]);
}
