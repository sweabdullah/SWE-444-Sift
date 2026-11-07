import type { Locale, Prisma } from "@prisma/client";
import { prisma } from "./client.js";

/** Both languages for search normalization; never expose draft or archived card names. */
export function findPublishedCardNames() {
  return prisma.card.findMany({
    where: { status: "published" },
    select: {
      id: true,
      bank: { select: { nameAr: true, nameEn: true } },
      translations: { select: { name: true } },
    },
  });
}

/**
 * Published cards for the public card list: name in one locale, both bank names, the card's main
 * reward type (its headline reward), the annual fee and the reward tiers in their published order (for the rate on each row and the rate sort).
 * `where` narrows the list (the visitor's filters); it is always combined with
 * `status = published` here, in the database, so no filter can reach a draft or archived card.
 */
export function findPublishedCardsForList(locale: Locale, where: Prisma.CardWhereInput = {}) {
  return prisma.card.findMany({
    where: { AND: [{ status: "published" }, where] },
    select: {
      id: true,
      rewardType: true,
      bank: { select: { nameAr: true, nameEn: true, entryUrls: { select: { url: true } } } },
      source: { select: { url: true } },
      verifiedAt: true,
      fee: { select: { annualFee: true } },
      translations: { where: { locale }, select: { name: true } },
      rewardTiers: {
        orderBy: { sortOrder: "asc" },
        select: {
          rewardType: true,
          spendingCategory: true,
          rate: true,
          rateUnit: true,
          minSpend: true,
        },
      },
    },
  });
}

export type PublishedCardRow = Awaited<ReturnType<typeof findPublishedCardsForList>>[number];

/** How many published cards match `where` (used for "N cards hidden" notes under a filter). */
export function countPublishedCards(where: Prisma.CardWhereInput) {
  return prisma.card.count({ where: { AND: [{ status: "published" }, where] } });
}

/** Public detail lookup. Drafts and archived cards are excluded in the database itself. */
export function findPublishedCardById(id: string, locale: Locale) {
  return prisma.card.findFirst({
    where: { id, status: "published" },
    select: {
      id: true,
      bank: { select: { nameAr: true, nameEn: true, entryUrls: { select: { url: true } } } },
      source: { select: { url: true } },
      verifiedAt: true,
      minMonthlyIncome: true,
      fee: {
        select: {
          annualFee: true,
          issuanceFee: true,
          supplementaryCardFee: true,
          fxMarkupPct: true,
          cashAdvanceFee: true,
          latePaymentFee: true,
        },
      },
      translations: {
        where: { locale },
        select: {
          name: true,
          feeWaiverCondition: true,
          benefitsDescription: true,
          rewardConditions: true,
          eligibility: true,
        },
      },
    },
  });
}

export type PublishedCardDetailRow = NonNullable<Awaited<ReturnType<typeof findPublishedCardById>>>;
