import Link from "next/link";
import type { SearchParams } from "@/lib/filters";
import type { Locale, Translator } from "@/lib/i18n";
import { pageHref, type Page } from "@/lib/pagination";

type Props = {
  locale: Locale;
  t: Translator;
  /** The current query string, so page links keep the filters, sort and anything else in it. */
  params: SearchParams;
  page: Pick<Page<unknown>, "page" | "pageCount" | "total" | "start" | "end">;
};

/**
 * Previous / next links under the catalogue, with "Cards 7 to 8 of 8" and "Page 2 of 2".
 * Plain links (no JavaScript), so every page has its own URL that can be bookmarked or shared.
 * Server component. Hidden when everything fits on one page.
 */
export function CataloguePagination({ locale, t, params, page }: Props) {
  if (page.pageCount <= 1) return null;
  const hasPrevious = page.page > 1;
  const hasNext = page.page < page.pageCount;

  return (
    <nav
      aria-label={t("catalogue.pagination.label")}
      className="flex flex-col items-center gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between"
    >
      <p className="text-label text-platinum-deep">
        {t("catalogue.pagination.showing", { start: page.start, end: page.end, total: page.total })}
      </p>
      <div className="flex items-center gap-3">
        <PageLink
          href={hasPrevious ? pageHref(locale, params, page.page - 1) : null}
          rel="prev"
          label={t("catalogue.pagination.previous")}
          direction="previous"
        />
        <p className="text-label whitespace-nowrap text-platinum-deep">
          {t("catalogue.pagination.status", { page: page.page, pages: page.pageCount })}
        </p>
        <PageLink
          href={hasNext ? pageHref(locale, params, page.page + 1) : null}
          rel="next"
          label={t("catalogue.pagination.next")}
          direction="next"
        />
      </div>
    </nav>
  );
}

const linkClass =
  "flex min-h-11 items-center gap-1 whitespace-nowrap rounded-md border border-line bg-white ps-3 pe-4 py-2 text-label";

/** One previous/next control: a link, or a dimmed, non-focusable label on the first/last page. */
function PageLink({
  href,
  rel,
  label,
  direction,
}: {
  href: string | null;
  rel: "prev" | "next";
  label: string;
  direction: "previous" | "next";
}) {
  const content =
    direction === "previous" ? (
      <>
        <Chevron direction="previous" />
        {label}
      </>
    ) : (
      <>
        {label}
        <Chevron direction="next" />
      </>
    );
  if (href === null) {
    return (
      <span aria-disabled="true" className={`${linkClass} text-platinum opacity-60`}>
        {content}
      </span>
    );
  }
  return (
    <Link href={href} rel={rel} className={`${linkClass} hover:border-platinum-deep`}>
      {content}
    </Link>
  );
}

/**
 * A directional chevron. Drawn pointing left/right for LTR and mirrored in RTL (`rtl:-scale-x-100`),
 * because "previous" points towards the start of the line, which is on the right in Arabic.
 * Unlike the riyal symbol or a logo, a direction arrow must mirror.
 */
function Chevron({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className="size-4 shrink-0 rtl:-scale-x-100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-direction={direction}
    >
      <path d={direction === "previous" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"} />
    </svg>
  );
}
