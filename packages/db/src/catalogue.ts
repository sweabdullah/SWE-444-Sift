/**
 * Public catalogue reads (Lane B browse/detail/compare, Lane D filters/search/sort).
 * RULE: every function here filters `status = published` IN THE QUERY, never afterwards.
 */
import type { Prisma } from "@prisma/client";
import {
  CardFiltersSchema,
  DEFAULT_LOCALE,
  type Bank,
  type CardFilters,
  type CardFiltersInput,
  type CardView,
  type Locale,
} from "@sift/schema";
import { z } from "zod";
import { prisma } from "./client.js";
import { cardViewInclude, toCardView } from "./mappers.js";

/** The public-visibility condition. Every public query ANDs this in. */
export const PUBLISHED_ONLY = { status: "published" } as const satisfies Prisma.CardWhereInput;

/** Arabic diacritics (tashkeel) and tatweel, stripped from search queries. */
const ARABIC_MARKS = /[ً-ٰٟـ]/g;

type FilterPart = "fee" | "income" | "sharia";

function buildWhere(f: CardFilters, omit?: FilterPart): Prisma.CardWhereInput {
  const and: Prisma.CardWhereInput[] = [PUBLISHED_ONLY];
  if (f.rewardTypes && f.rewardTypes.length > 0) {
    // Union: the card's own type or any of its tiers' types.
    const anyOf = { in: f.rewardTypes };
    and.push({ OR: [{ rewardType: anyOf }, { rewardTiers: { some: { rewardType: anyOf } } }] });
  }
  if (omit !== "fee" && (f.minAnnualFee !== undefined || f.maxAnnualFee !== undefined)) {
    // gte/lte never match NULL, so an unpublished fee is excluded, never treated as 0.
    and.push({ fee: { is: { annualFee: { gte: f.minAnnualFee, lte: f.maxAnnualFee } } } });
  }
  if (omit !== "income" && f.income !== undefined) {
    and.push({ minMonthlyIncome: { lte: f.income } });
  }
  if (omit !== "sharia" && f.shariaOnly) {
    and.push({ shariaCompliant: true });
  }
  const q = f.q?.replace(ARABIC_MARKS, "").trim();
  if (q) {
    const contains = { contains: q, mode: "insensitive" } as const;
    and.push({
      OR: [
        { translations: { some: { name: contains } } },
        { bank: { nameEn: contains } },
        { bank: { nameAr: contains } },
      ],
    });
  }
  return { AND: and };
}

const NEUTRAL_ORDER: Prisma.CardOrderByWithRelationInput[] = [
  { bank: { nameEn: "asc" } },
  { normalisedName: "asc" },
  { id: "asc" },
];

export interface CardPage {
  items: CardView[];
  total: number;
  page: number;
  pageSize: number;
  /**
   * How many cards an active filter excluded because the bank has not published that
   * figure (S-9, S-10, S-11). null when that filter is not active.
   */
  excludedUnknown: {
    annualFee: number | null;
    minMonthlyIncome: number | null;
    shariaCompliant: number | null;
  };
}

/**
 * List published cards matching the catalogue filters, one page at a time.
 * Sort `annual_fee_asc`: free first, unpublished fees last. Sort `reward_rate_desc`: by the
 * card's maximum tier rate (cards without tiers last). Unset: neutral bank/name order.
 *
 * Owner: Lane B (S-1 browse). Filter/search/sort evolution: Lane D (S-8 … S-13).
 */
export async function listPublishedCards(filters: CardFiltersInput = {}): Promise<CardPage> {
  const f = CardFiltersSchema.parse(filters);
  const where = buildWhere(f);
  const skip = (f.page - 1) * f.pageSize;

  const feeActive = f.minAnnualFee !== undefined || f.maxAnnualFee !== undefined;
  const unpublishedFee: Prisma.CardWhereInput = {
    OR: [{ fee: { is: null } }, { fee: { is: { annualFee: null } } }],
  };
  const [total, unknownFee, unknownIncome, unknownSharia] = await Promise.all([
    prisma.card.count({ where }),
    feeActive
      ? prisma.card.count({ where: { AND: [buildWhere(f, "fee"), unpublishedFee] } })
      : null,
    f.income !== undefined
      ? prisma.card.count({ where: { AND: [buildWhere(f, "income"), { minMonthlyIncome: null }] } })
      : null,
    f.shariaOnly
      ? prisma.card.count({ where: { AND: [buildWhere(f, "sharia"), { shariaCompliant: null }] } })
      : null,
  ]);

  let rows;
  if (f.sort === "reward_rate_desc") {
    // Prisma cannot ORDER BY an aggregate of a relation. The published catalogue is small,
    // so rank ids in memory (stable over the neutral order) and fetch only the page.
    const candidates = await prisma.card.findMany({
      where,
      orderBy: NEUTRAL_ORDER,
      select: { id: true, rewardTiers: { select: { rate: true } } },
    });
    const pageIds = candidates
      .map((c) => ({
        id: c.id,
        rate:
          c.rewardTiers.length === 0
            ? -1
            : Math.max(...c.rewardTiers.map((t) => t.rate.toNumber())),
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(skip, skip + f.pageSize)
      .map((c) => c.id);
    const found = await prisma.card.findMany({
      where: { AND: [PUBLISHED_ONLY, { id: { in: pageIds } }] },
      include: cardViewInclude,
    });
    rows = pageIds.flatMap((id) => found.filter((r) => r.id === id));
  } else {
    rows = await prisma.card.findMany({
      where,
      include: cardViewInclude,
      orderBy:
        f.sort === "annual_fee_asc"
          ? [{ fee: { annualFee: { sort: "asc", nulls: "last" } } }, ...NEUTRAL_ORDER]
          : NEUTRAL_ORDER,
      skip,
      take: f.pageSize,
    });
  }

  return {
    items: rows.map((r) => toCardView(r, f.locale)),
    total,
    page: f.page,
    pageSize: f.pageSize,
    excludedUnknown: {
      annualFee: unknownFee,
      minMonthlyIncome: unknownIncome,
      shariaCompliant: unknownSharia,
    },
  };
}

/**
 * One published card by id, resolved to `locale`. `translationFallback` is true when the
 * card has no translation in that locale and the other one is returned. null when the card
 * does not exist or is not published.
 *
 * Owner: Lane B (S-2 detail page). Cards have no slug column yet, so lookup is by id only.
 */
export async function getCard(
  id: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<CardView | null> {
  const row = await prisma.card.findFirst({
    where: { AND: [PUBLISHED_ONLY, { id }] },
    include: cardViewInclude,
  });
  return row ? toCardView(row, locale) : null;
}

export const MAX_COMPARISON = 4;
const ComparisonIdsSchema = z.array(z.string().min(1)).max(MAX_COMPARISON);

/**
 * Up to four published cards for the comparison table, in the order of `ids`. Ids that are
 * unknown or no longer published are left out (compare lengths to detect it). More than
 * four ids throws a ZodError: the limit is enforced here too, not only in the UI.
 *
 * Owner: Lane B (S-15, S-16).
 */
export async function getCardsForComparison(
  ids: string[],
  locale: Locale = DEFAULT_LOCALE,
): Promise<CardView[]> {
  const wanted = ComparisonIdsSchema.parse(ids);
  if (wanted.length === 0) return [];
  const rows = await prisma.card.findMany({
    where: { AND: [PUBLISHED_ONLY, { id: { in: wanted } }] },
    include: cardViewInclude,
  });
  return wanted.flatMap((id) => rows.filter((r) => r.id === id).map((r) => toCardView(r, locale)));
}

/**
 * Banks, ordered by English name. `activeOnly` (default true) hides deactivated banks.
 *
 * Owner: Lane B (catalogue). Also read by Lane C (admin) and Lane E (S-28 register bank).
 */
export async function listBanks(options: { activeOnly?: boolean } = {}): Promise<Bank[]> {
  const { activeOnly = true } = options;
  return prisma.bank.findMany({
    where: activeOnly ? { active: true } : {},
    orderBy: [{ nameEn: "asc" }, { id: "asc" }],
    select: { id: true, slug: true, nameAr: true, nameEn: true, homepageUrl: true, active: true },
  });
}
