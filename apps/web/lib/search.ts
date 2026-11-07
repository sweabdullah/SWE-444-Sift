import type { Prisma } from "@sift/db";

/** Strip Arabic vowel/recitation marks, preserving letters (including hamza and alef). */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\p{Mark}/gu, (mark) => (/\p{Script_Extensions=Arabic}/u.test(mark) ? "" : mark))
    .trim()
    .toLowerCase();
}

export interface SearchableCard {
  id: string;
  bank: { nameAr: string; nameEn: string };
  translations: { name: string }[];
}

/** Match either language, independently of the display locale. Names come from published cards. */
export function buildSearchWhere(cards: SearchableCard[], query: string): Prisma.CardWhereInput {
  const needle = normalizeSearch(query);
  if (!needle) return {};
  const ids = cards
    .filter((card) =>
      [card.bank.nameAr, card.bank.nameEn, ...card.translations.map(({ name }) => name)].some(
        (name) => normalizeSearch(name).includes(needle),
      ),
    )
    .map(({ id }) => id);
  return { id: { in: ids } };
}
