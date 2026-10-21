/**
 * A signed-in user's shortlist (Lane C, S-23 / S-24). Callers must pass the user id from
 * the server-side session, never from the request body.
 */
import { DEFAULT_LOCALE, type Locale, type Shortlist, type ShortlistItem } from "@sift/schema";
import { prisma } from "./client.js";
import { PUBLISHED_ONLY } from "./catalogue.js";
import { cardViewInclude, toCardView } from "./mappers.js";

/**
 * The user's saved cards, newest first. A card that is no longer published keeps its entry
 * with `card: null`, so the UI can say "no longer available" instead of dropping it (S-24).
 *
 * Owner: Lane C.
 */
export async function getShortlist(
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
): Promise<ShortlistItem[]> {
  const rows = await prisma.shortlist.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { card: { include: cardViewInclude } },
  });
  return rows.map(({ card, ...entry }) => ({
    id: entry.id,
    userId: entry.userId,
    cardId: entry.cardId,
    createdAt: entry.createdAt,
    card: card.status === "published" ? toCardView(card, locale) : null,
  }));
}

/**
 * Save a card. Idempotent (saving twice returns the existing entry). Only published cards
 * can be saved; returns null when the card is unknown or not published.
 *
 * Owner: Lane C.
 */
export async function addToShortlist(userId: string, cardId: string): Promise<Shortlist | null> {
  const card = await prisma.card.findFirst({
    where: { AND: [PUBLISHED_ONLY, { id: cardId }] },
    select: { id: true },
  });
  if (!card) return null;
  return prisma.shortlist.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId },
    update: {},
    select: { id: true, userId: true, cardId: true, createdAt: true },
  });
}

/**
 * Remove a card from the shortlist. Returns true when an entry was removed.
 *
 * Owner: Lane C.
 */
export async function removeFromShortlist(userId: string, cardId: string): Promise<boolean> {
  const { count } = await prisma.shortlist.deleteMany({ where: { userId, cardId } });
  return count > 0;
}
