import type { Locale } from "@sift/schema";
import type { SearchParams } from "./filters";

/** Query parameter name for the catalogue page (1-based). Absent means page 1. */
export const PAGE_PARAM = "page";

/**
 * Cards per catalogue page. Six fills two rows of the three-column desktop grid and three rows
 * of the two-column one, and keeps a phone page short. The eight seeded cards span two pages.
 */
export const CATALOGUE_PAGE_SIZE = 6;

/**
 * Read the requested page from the query string: a whole number >= 1. Absent, empty, zero,
 * negative, fractional or non-numeric values mean page 1, so a hand-edited link still works.
 * Pages past the end are clamped later, by `paginate`, once the total is known.
 */
export function parsePage(params: SearchParams): number {
  const value = params[PAGE_PARAM];
  const raw = (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  if (!/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** One page of a list, with what the page needs to describe and link to its neighbours. */
export interface Page<T> {
  items: T[];
  /** The page shown, 1-based, after clamping into 1..pageCount. */
  page: number;
  /** At least 1, so an empty list is "page 1 of 1". */
  pageCount: number;
  total: number;
  /** 1-based position of the first and last item shown; both 0 when the list is empty. */
  start: number;
  end: number;
}

/**
 * Cut one page out of an already sorted list. A page past the end shows the last page rather
 * than an empty one (a bookmarked page-3 link still shows cards after the catalogue shrinks).
 */
export function paginate<T>(items: T[], requested: number, size = CATALOGUE_PAGE_SIZE): Page<T> {
  if (!Number.isInteger(size) || size < 1) throw new Error(`Invalid page size ${size}`);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Math.floor(requested)), pageCount);
  const offset = (page - 1) * size;
  const shown = items.slice(offset, offset + size);
  return {
    items: shown,
    page,
    pageCount,
    total,
    start: shown.length > 0 ? offset + 1 : 0,
    end: offset + shown.length,
  };
}

/**
 * Link to another page of the catalogue, keeping every other query parameter as it is (filters,
 * sort, and anything added later such as search), so moving between pages never drops what the
 * visitor chose. Page 1 has no `page` parameter, so it is the same URL as the unpaginated view.
 */
export function pageHref(locale: Locale, params: SearchParams, page: number): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (name === PAGE_PARAM || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) query.append(name, v);
  }
  if (page > 1) query.set(PAGE_PARAM, String(page));
  const search = query.toString();
  return search ? `/${locale}?${search}` : `/${locale}`;
}
