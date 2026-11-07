import type { RateUnit } from "@sift/db";
import type { Locale } from "@sift/schema";
import {
  compareCards,
  summarizeRewardRate,
  type CatalogueSort,
  type RewardRateSummary,
} from "./sort";

/** One card as the public card list shows it. */
export interface CardListItem {
  id: string;
  name: string;
  bankName: string;
  registeredSiteUrls: string[];
  sourceUrl: string;
  verifiedAt: Date | null;
  /** SAR per year. `null` = the bank has not published it (never shown as 0). */
  annualFee: number | null;
  /** Highest and base rate in the card's headline unit. `null` = no reward tiers published. */
  rewardRate: RewardRateSummary | null;
}

type DecimalLike = { toString(): string };

/**
 * The shape of a published-card row from `findPublishedCardsForList` (@sift/db). Kept structural
 * so this module and its tests never load Prisma; a Prisma Decimal satisfies `toString()`.
 */
export interface CardListRow {
  id: string;
  bank: { nameAr: string; nameEn: string; entryUrls: { url: string }[] };
  source: { url: string };
  verifiedAt: Date | null;
  fee: { annualFee: DecimalLike | null } | null;
  translations: { name: string }[];
  rewardTiers: {
    spendingCategory: string;
    rate: DecimalLike;
    rateUnit: RateUnit;
    minSpend: DecimalLike | null;
  }[];
}

function toNumber(value: DecimalLike | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value.toString());
}

/**
 * Turn database rows into list items for one locale, in the visitor's sort order (lib/sort.ts).
 * The default is alphabetical by bank name and then card name on purpose: Sift never orders
 * cards by merit unless the visitor asks. A card with no name in this locale is left out rather
 * than shown in the other language (nothing is translated).
 */
export function toCardList(
  rows: CardListRow[],
  locale: Locale,
  sort: CatalogueSort = "default",
): CardListItem[] {
  const items: CardListItem[] = [];
  for (const row of rows) {
    const name = row.translations[0]?.name;
    if (!name) continue;
    items.push({
      id: row.id,
      name,
      bankName: locale === "ar" ? row.bank.nameAr : row.bank.nameEn,
      registeredSiteUrls: row.bank.entryUrls.map((entry) => entry.url),
      sourceUrl: row.source.url,
      verifiedAt: row.verifiedAt,
      annualFee: toNumber(row.fee?.annualFee),
      rewardRate: summarizeRewardRate(
        row.rewardTiers.map((tier) => ({
          spendingCategory: tier.spendingCategory,
          rate: Number(tier.rate.toString()),
          rateUnit: tier.rateUnit,
          minSpend: toNumber(tier.minSpend),
        })),
      ),
    });
  }
  return items.sort(compareCards(sort, locale));
}
