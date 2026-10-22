import { notFound } from "next/navigation";

/**
 * Catch-all for unknown paths under /ar or /en (e.g. /en/cards before that route exists).
 * Calling notFound() here renders app/[locale]/not-found.tsx INSIDE the locale layout,
 * so the 404 page keeps <html lang dir>. Real routes always win over this catch-all.
 */
// The locale layout sets dynamicParams = false (only /ar and /en); the rest segment must
// stay dynamic, or Next returns its bare default 404 before this page can run.
export const dynamicParams = true;

export default function CatchAll() {
  notFound();
}
