import type { Locale } from "@prisma/client";
import { prisma } from "./client.js";

/**
 * Published cards for the public card list: name in one locale, both bank names and the annual
 * fee. Public queries filter `status = published` here, in the database, never in the page.
 */
export function findPublishedCardsForList(locale: Locale) {
  return prisma.card.findMany({
    where: { status: "published" },
    select: {
      id: true,
      bank: { select: { nameAr: true, nameEn: true } },
      fee: { select: { annualFee: true } },
      translations: { where: { locale }, select: { name: true } },
    },
  });
}

export type PublishedCardRow = Awaited<ReturnType<typeof findPublishedCardsForList>>[number];
