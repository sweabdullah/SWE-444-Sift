/**
 * Domain read models: the shapes @sift/db's data-access functions return.
 *
 * Money and rates are plain `number` (SAR, or percent for `fxMarkupPct`); @sift/db converts
 * Prisma's Decimal at the edge. NULL IS NOT ZERO: `null` means "the bank has not published
 * it", `0` means the bank published "free". Never default one to the other.
 */
import { z } from "zod";
import {
  CapPeriodSchema,
  CardNetworkSchema,
  CardStatusSchema,
  CrawlRunStatusSchema,
  CrawlTriggerSchema,
  LocaleSchema,
  PendingRequestKindSchema,
  PendingRequestStatusSchema,
  RateUnitSchema,
  RewardTypeSchema,
  SourceTypeSchema,
  SpendingCategorySchema,
} from "./enums.js";

/** A published figure: a non-negative finite number, or null when not published. */
export const amountOrNull = () => z.number().finite().nonnegative().nullable();

export const BankSchema = z.object({
  id: z.string(),
  slug: z.string(),
  nameAr: z.string(),
  nameEn: z.string(),
  homepageUrl: z.string(),
  active: z.boolean(),
});
export type Bank = z.infer<typeof BankSchema>;

/** The bank fields a card view carries. */
export const BankRefSchema = BankSchema.pick({ id: true, slug: true, nameAr: true, nameEn: true });
export type BankRef = z.infer<typeof BankRefSchema>;

export const SourceSchema = z.object({
  id: z.string(),
  bankId: z.string(),
  url: z.string(),
  sourceType: SourceTypeSchema,
  fetchedAt: z.date(),
  contentHash: z.string().nullable(),
});
export type Source = z.infer<typeof SourceSchema>;

/** Every prose field of a card in one locale. */
export const CardTranslationSchema = z.object({
  locale: LocaleSchema,
  name: z.string(),
  benefitsDescription: z.string().nullable(),
  rewardConditions: z.string().nullable(),
  eligibility: z.string().nullable(),
  /** The seventh fee field (annual-fee waiver condition), as prose. */
  feeWaiverCondition: z.string().nullable(),
});
export type CardTranslation = z.infer<typeof CardTranslationSchema>;

/**
 * The seven agreed fee fields. Six amounts plus the waiver condition (prose, in the
 * view's locale). Each is independently nullable: null = not published, 0 = free.
 */
export const FeesSchema = z.object({
  /** SAR per year. */
  annualFee: amountOrNull(),
  /** SAR, one-off. */
  issuanceFee: amountOrNull(),
  /** SAR per supplementary card per year. */
  supplementaryCardFee: amountOrNull(),
  /** Percent of the transaction amount (2.75 = 2.75 %). */
  fxMarkupPct: amountOrNull(),
  /** SAR per withdrawal. */
  cashAdvanceFee: amountOrNull(),
  /** SAR per late payment. */
  latePaymentFee: amountOrNull(),
  /** Prose, in the view's locale. */
  feeWaiverCondition: z.string().nullable(),
});
export type Fees = z.infer<typeof FeesSchema>;

/** Names of the six numeric fee fields, in display order. */
export const FEE_AMOUNT_FIELDS = [
  "annualFee",
  "issuanceFee",
  "supplementaryCardFee",
  "fxMarkupPct",
  "cashAdvanceFee",
  "latePaymentFee",
] as const;

export const RewardTierSchema = z.object({
  id: z.string(),
  rewardType: RewardTypeSchema,
  spendingCategory: SpendingCategorySchema,
  rate: z.number().finite().nonnegative(),
  rateUnit: RateUnitSchema,
  /** Max reward per capPeriod. null = no published cap. */
  cap: amountOrNull(),
  capPeriod: CapPeriodSchema.nullable(),
  /** SAR per month needed before the tier applies. null = none published. */
  minSpend: amountOrNull(),
  sortOrder: z.number().int(),
  /** Prose condition in the view's locale; null if not published in either locale. */
  condition: z.string().nullable(),
});
export type RewardTier = z.infer<typeof RewardTierSchema>;

/** Language-neutral card facts (one row of `card`). */
export const CardSchema = z.object({
  id: z.string(),
  bankId: z.string(),
  canonicalUrl: z.string(),
  normalisedName: z.string(),
  status: CardStatusSchema,
  rewardType: RewardTypeSchema,
  network: CardNetworkSchema.nullable(),
  /** Only what the bank states. null = unknown, false = bank says not compliant. */
  shariaCompliant: z.boolean().nullable(),
  /** SAR per month. null = not published. */
  minMonthlyIncome: amountOrNull(),
  sourceId: z.string(),
  verifiedAt: z.date().nullable(),
  publishedAt: z.date().nullable(),
  archivedAt: z.date().nullable(),
});
export type Card = z.infer<typeof CardSchema>;

/**
 * A card as the public site shows it, resolved to one locale. Returned by
 * listPublishedCards, getCard and getCardsForComparison.
 */
export const CardViewSchema = CardSchema.extend({
  bank: BankRefSchema,
  /** The translation in the requested locale, or the other one when it is missing. */
  translation: CardTranslationSchema,
  /** true when `translation.locale` differs from the requested locale. */
  translationFallback: z.boolean(),
  fees: FeesSchema,
  /** Ordered by sortOrder. */
  rewardTiers: z.array(RewardTierSchema),
  /** The card's official source link and date (S-4). */
  source: SourceSchema.pick({ id: true, url: true, sourceType: true, fetchedAt: true }),
});
export type CardView = z.infer<typeof CardViewSchema>;

export const ShortlistSchema = z.object({
  id: z.string(),
  userId: z.string(),
  cardId: z.string(),
  createdAt: z.date(),
});
export type Shortlist = z.infer<typeof ShortlistSchema>;

/** A shortlist entry. `card` is null when the card is no longer published (S-24). */
export const ShortlistItemSchema = ShortlistSchema.extend({
  card: CardViewSchema.nullable(),
});
export type ShortlistItem = z.infer<typeof ShortlistItemSchema>;

export const CrawlRunSchema = z.object({
  id: z.string(),
  bankId: z.string(),
  trigger: CrawlTriggerSchema,
  status: CrawlRunStatusSchema,
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  pagesFetched: z.number().int().nonnegative(),
  cardsFound: z.number().int().nonnegative(),
  error: z.string().nullable(),
});
export type CrawlRun = z.infer<typeof CrawlRunSchema>;

/** One validation problem, stored in pending_request.validation_errors. */
export const ValidationIssueSchema = z.object({
  path: z.string(),
  code: z.string(),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

/**
 * A pending request row. `payload` is the raw draft exactly as received (kept even when it
 * fails validation, so the failure can be diagnosed — S-45). Parse it with
 * ExtractedCardSchema / WithdrawalPayloadSchema before use.
 */
export const PendingRequestSchema = z.object({
  id: z.string(),
  kind: PendingRequestKindSchema,
  status: PendingRequestStatusSchema,
  bankId: z.string(),
  cardId: z.string().nullable(),
  crawlRunId: z.string().nullable(),
  sourceId: z.string(),
  payload: z.unknown(),
  validationErrors: z.array(ValidationIssueSchema).nullable(),
  createdAt: z.date(),
  reviewedById: z.string().nullable(),
  reviewedAt: z.date().nullable(),
  reviewNote: z.string().nullable(),
});
export type PendingRequest = z.infer<typeof PendingRequestSchema>;

/** A field-level before/after record written on approval (S-50); digest reads notifiedAt. */
export const CardChangeSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  pendingRequestId: z.string(),
  /** Dotted path, same as card_field_source.field_name, e.g. "fee.annual_fee". */
  fieldName: z.string(),
  locale: LocaleSchema.nullable(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  approvedAt: z.date(),
  notifiedAt: z.date().nullable(),
});
export type CardChange = z.infer<typeof CardChangeSchema>;
