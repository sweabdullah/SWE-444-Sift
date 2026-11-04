import type { Locale, Prisma } from "@prisma/client";
import { prisma } from "./client.js";

/**
 * Published cards for the public card list: name in one locale, both bank names and the annual
 * fee. `where` narrows the list (the visitor's filters); it is always combined with
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
    },
  });
}

export type PublishedCardRow = Awaited<ReturnType<typeof findPublishedCardsForList>>[number];
