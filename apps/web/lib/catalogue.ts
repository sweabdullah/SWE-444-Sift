import type { Locale } from "@sift/schema";

/** One card as the public card list shows it. */
export interface CardListItem {
  id: string;
  name: string;
  bankName: string;
  /** SAR per year. `null` = the bank has not published it (never shown as 0). */
  annualFee: number | null;
}

/**
 * The shape of a published-card row from `findPublishedCardsForList` (@sift/db). Kept structural
 * so this module and its tests never load Prisma; a Prisma Decimal satisfies `toString()`.
 */
export interface CardListRow {
  id: string;
  bank: { nameAr: string; nameEn: string };
  fee: { annualFee: { toString(): string } | null } | null;
  translations: { name: string }[];
}

/**
 * Turn database rows into list items for one locale, sorted by bank name and then card name.
 * The sort is alphabetical on purpose: Sift never orders cards by merit. A card with no name in
 * this locale is left out rather than shown in the other language (nothing is translated).
 */
export function toCardList(rows: CardListRow[], locale: Locale): CardListItem[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  const items: CardListItem[] = [];
  for (const row of rows) {
    const name = row.translations[0]?.name;
    if (!name) continue;
    const fee = row.fee?.annualFee;
    items.push({
      id: row.id,
      name,
      bankName: locale === "ar" ? row.bank.nameAr : row.bank.nameEn,
      annualFee: fee === null || fee === undefined ? null : Number(fee.toString()),
    });
  }
  return items.sort(
    (a, b) => collator.compare(a.bankName, b.bankName) || collator.compare(a.name, b.name),
  );
}
