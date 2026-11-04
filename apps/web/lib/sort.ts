// Type-only imports: this module and its tests never load the Prisma client.
import type { RateUnit } from "@sift/db";
import type { Locale } from "@sift/schema";
import { formatNumber } from "./format";
import type { Translator } from "./i18n";

/**
 * The catalogue sort orders. `default` is alphabetical by bank name, then card name: Sift never
 * ranks cards by merit unless the visitor asks for an order. `fee` is annual fee, lowest first;
 * `rate` is reward rate, highest first (see `compareCards` for the exact rules).
 */
export const SORT_ORDERS = ["default", "fee", "rate"] as const;

export type CatalogueSort = (typeof SORT_ORDERS)[number];

/** Query parameter name. Sits beside the filter parameters in the same GET form. */
export const SORT_PARAM = "sort";

/**
 * Rate units in the order the rate sort groups them. Rates in different units can't be compared
 * (2% cashback is not "more" than 1 point per SAR), so cards are grouped by unit first.
 */
export const RATE_UNIT_ORDER = [
  "percent",
  "points_per_sar",
  "miles_per_sar",
] as const satisfies readonly RateUnit[];

/**
 * A card's reward rate in its headline unit: the highest rate it can earn and its base rate, so a
 * row never shows an "up to" figure without the rate most spending actually earns.
 */
export interface RewardRateSummary {
  unit: RateUnit;
  /** The highest rate in `unit`, across every tier and spending category. */
  max: number;
  /** The `general` tier with no (or the lowest) minimum spend; else the lowest rate in `unit`. */
  base: number;
}

/** The fields of a reward tier the summary needs, with Decimals already read as numbers. */
export interface RateTier {
  spendingCategory: string;
  rate: number;
  rateUnit: RateUnit;
  /** SAR per month. `null` = no minimum spend published. */
  minSpend: number | null;
}

/** The fields of a card the comparator reads (a `CardListItem` satisfies it). */
export interface SortableCard {
  name: string;
  bankName: string;
  annualFee: number | null;
  rewardRate: RewardRateSummary | null;
}

function isCatalogueSort(value: string): value is CatalogueSort {
  return (SORT_ORDERS as readonly string[]).includes(value);
}

/** Read the sort from the query string. Absent, empty or unknown values mean `default`. */
export function parseSort(params: Record<string, string | string[] | undefined>): CatalogueSort {
  const value = params[SORT_PARAM];
  const raw = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  return isCatalogueSort(raw) ? raw : "default";
}

/**
 * The "Clear filters" target: the catalogue with no filters, keeping the visitor's sort so
 * clearing filters never resets the order they chose.
 */
export function clearFiltersHref(locale: Locale, sort: CatalogueSort): string {
  return sort === "default" ? `/${locale}` : `/${locale}?${SORT_PARAM}=${sort}`;
}

/**
 * Summarise a card's tiers. The headline unit is the first of RATE_UNIT_ORDER the card has, so a
 * card with cashback and points tiers is summarised (and sorted) by its cashback. `null` when the
 * card has no tiers: its rate is not published.
 */
export function summarizeRewardRate(tiers: RateTier[]): RewardRateSummary | null {
  const unit = RATE_UNIT_ORDER.find((u) => tiers.some((tier) => tier.rateUnit === u));
  if (!unit) return null;
  const inUnit = tiers.filter((tier) => tier.rateUnit === unit);
  const rates = inUnit.map((tier) => tier.rate);

  // Base: the general-spend tier that applies with the least spending (no minimum first, then
  // the lowest minimum; the lower rate if still tied). A card with no general tier only earns in
  // named categories, so its lowest rate is the honest base.
  const general = inUnit
    .filter((tier) => tier.spendingCategory === "general")
    .sort((a, b) => (a.minSpend ?? 0) - (b.minSpend ?? 0) || a.rate - b.rate);

  return {
    unit,
    max: Math.max(...rates),
    base: general[0]?.rate ?? Math.min(...rates),
  };
}

/**
 * One rate with its unit, e.g. "2%", "1 pt / SAR", "0.33 miles / SAR". At most two decimals and
 * Western digits in both locales, like the fees.
 */
export function formatRate(t: Translator, locale: Locale, unit: RateUnit, rate: number): string {
  return t(`catalogue.rate.${unit}`, {
    rate: formatNumber(rate, locale, { maximumFractionDigits: 2 }),
  });
}

/** Where a card's rate group sits in the rate sort; cards with no published rate go last. */
function rateGroup(card: SortableCard): number {
  return card.rewardRate ? RATE_UNIT_ORDER.indexOf(card.rewardRate.unit) : RATE_UNIT_ORDER.length;
}

/**
 * The comparator for a sort order. Every order falls back to bank name, then card name, so ties
 * (and the default order) are alphabetical in the locale's alphabet.
 * - `fee`: lowest annual fee first, 0 before any paid fee. A fee the bank has not published sorts
 *   last, never as 0.
 * - `rate`: grouped by unit (percent, then points per SAR, then miles per SAR), highest maximum
 *   rate first within a group. Cards with no published rate sort last.
 */
export function compareCards(
  sort: CatalogueSort,
  locale: Locale,
): (a: SortableCard, b: SortableCard) => number {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const byName = (a: SortableCard, b: SortableCard) =>
    collator.compare(a.bankName, b.bankName) || collator.compare(a.name, b.name);

  if (sort === "fee") {
    return (a, b) => {
      if (a.annualFee === null || b.annualFee === null) {
        const unknown = Number(a.annualFee === null) - Number(b.annualFee === null);
        return unknown || byName(a, b);
      }
      return a.annualFee - b.annualFee || byName(a, b);
    };
  }

  if (sort === "rate") {
    return (a, b) =>
      rateGroup(a) - rateGroup(b) ||
      (b.rewardRate?.max ?? 0) - (a.rewardRate?.max ?? 0) ||
      byName(a, b);
  }

  return byName;
}
