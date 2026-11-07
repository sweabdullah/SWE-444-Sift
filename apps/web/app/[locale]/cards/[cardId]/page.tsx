import { notFound } from "next/navigation";
import { findPublishedCardById } from "@sift/db";
import { CardDetail } from "@/components/CardDetail";
import { isLocale } from "@/lib/locale";

// Read on every request: unpublishing a card must also remove access through its direct URL.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ locale: string; cardId: string }>;
}) {
  const { locale, cardId } = await params;
  if (!isLocale(locale)) notFound();
  const card = await findPublishedCardById(cardId, locale);
  if (!card || !card.translations[0]?.name.trim()) notFound();
  return <CardDetail card={card} locale={locale} />;
}
