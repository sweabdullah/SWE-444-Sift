/**
 * Catalogue filters (S-1, S-8 … S-13). Accepts both typed values and URL search-param
 * strings ("cashback,miles", "500", "true"), so a page can pass searchParams straight in.
 */
import { z } from "zod";
import { DEFAULT_LOCALE } from "./locale.js";
import { LocaleSchema, RewardTypeSchema } from "./enums.js";

export const CARD_SORTS = ["annual_fee_asc", "reward_rate_desc"] as const;
export const CardSortSchema = z.enum(CARD_SORTS);
export type CardSort = z.infer<typeof CardSortSchema>;

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 24;

const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);
const optionalAmount = z.preprocess(
  emptyToUndefined,
  z.coerce.number().finite().nonnegative().optional(),
);

export const CardFiltersSchema = z.object({
  /** Union, not intersection: a card matches if its reward type or any tier's type is listed. */
  rewardTypes: z
    .preprocess(
      (v) => (typeof v === "string" ? v.split(",").filter(Boolean) : emptyToUndefined(v)),
      z.array(RewardTypeSchema).optional(),
    )
    .optional(),
  /** Annual-fee range in SAR, inclusive. Cards with an unpublished fee are excluded when set. */
  minAnnualFee: optionalAmount,
  maxAnnualFee: optionalAmount,
  /**
   * The visitor's monthly income in SAR: returns cards whose published minimum income is at
   * or below it. Cards with an unpublished minimum are excluded, never assumed to qualify.
   */
  income: optionalAmount,
  /** Only cards the bank states are Sharia-compliant. Unknown (null) is excluded. */
  shariaOnly: z
    .preprocess(
      (v) =>
        v === "true" || v === "1" ? true : v === "false" || v === "0" ? false : emptyToUndefined(v),
      z.boolean().optional(),
    )
    .optional(),
  /** Search in card names (both locales) and bank names (both languages). Case-insensitive. */
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  /** Unset = neutral order (bank, then card name). Never a score. */
  sort: z.preprocess(emptyToUndefined, CardSortSchema.optional()),
  locale: z.preprocess(emptyToUndefined, LocaleSchema.default(DEFAULT_LOCALE)),
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  pageSize: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  ),
});

/** Parsed filters (defaults applied). */
export type CardFilters = z.output<typeof CardFiltersSchema>;
/** What a caller may pass in (everything optional). */
export type CardFiltersInput = z.input<typeof CardFiltersSchema>;
