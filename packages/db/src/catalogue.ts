import type { Locale, Prisma } from "@prisma/client";
import { prisma } from "./client.js";

/**
 * Published cards for the public card list: name in one locale, both bank names, the annual fee
 * and the reward tiers in their published order (for the rate on each row and the rate sort).
 * `where` narrows the list (the visitor's filters); it is always combined with
 * `status = published` here, in the database, so no filter can reach a draft or archived card.
 */
export function findPublishedCardsForList(locale: Locale, where: Prisma.CardWhereInput = {}) {
  return prisma.card.findMany({
    where: { AND: [{ status: "published" }, where] },
    select: {
      id: true,
      bank: { select: { nameAr: true, nameEn: true } },
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
