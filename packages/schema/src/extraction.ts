/**
 * The EXTRACTION contract: what the AI extractor must output for one card page (S-44), and
 * what the pipeline validates before anything is stored (S-45). Used both to prompt the
 * model (z.toJSONSchema(ExtractedCardSchema)) and to validate its response.
 *
 * Rules baked in:
 * - Strict: unknown keys are rejected.
 * - Every key is required; "not on the page" is `null`, never omitted, never 0.
 * - Numbers must be real numbers. A rate the model could not parse is a validation
 *   failure, never coerced to 0.
 * - Bilingual text keeps each language in its own slot. An Arabic page fills `ar`
 *   and leaves `en` null; nothing is translated.
 * - Every published figure carries the URL it was read from (per-field source).
 */
import { z } from "zod";
import {
  CapPeriodSchema,
  CardNetworkSchema,
  LocaleSchema,
  RateUnitSchema,
  RewardTypeSchema,
  SpendingCategorySchema,
} from "./enums.js";

const url = () => z.url({ protocol: /^https?$/ });
const text = () => z.string().trim().min(1);

/** One text in both languages; either may be null. */
export const BilingualTextSchema = z.strictObject({
  ar: text().nullable(),
  en: text().nullable(),
});
export type BilingualText = z.infer<typeof BilingualTextSchema>;

/**
 * A single extracted figure with its source. `value: null` = not published on the page
 * (and then `sourceUrl` is null too). A non-null value must name its source URL.
 */
export function extractedField<T extends z.ZodType>(value: T) {
  return z
    .strictObject({ value: value.nullable(), sourceUrl: url().nullable() })
    .refine(
      (f: { value?: unknown; sourceUrl: string | null }) =>
        f.value === null || f.sourceUrl !== null,
      {
        message: "A published value must carry its sourceUrl",
        path: ["sourceUrl"],
      },
    );
}

const amountField = () => extractedField(z.number().finite().nonnegative());

export const ExtractedFeesSchema = z.strictObject({
  annualFee: amountField(),
  issuanceFee: amountField(),
  supplementaryCardFee: amountField(),
  /** Percent of the transaction (2.75 = 2.75 %). */
  fxMarkupPct: amountField(),
  cashAdvanceFee: amountField(),
  latePaymentFee: amountField(),
  /** The seventh fee field: prose. */
  feeWaiverCondition: extractedField(BilingualTextSchema),
});
export type ExtractedFees = z.infer<typeof ExtractedFeesSchema>;

export const ExtractedRewardTierSchema = z.strictObject({
  rewardType: RewardTypeSchema,
  spendingCategory: SpendingCategorySchema,
  rate: z.number().finite().nonnegative(),
  rateUnit: RateUnitSchema,
  cap: z.number().finite().nonnegative().nullable(),
  capPeriod: CapPeriodSchema.nullable(),
  minSpend: z.number().finite().nonnegative().nullable(),
  condition: BilingualTextSchema,
  sourceUrl: url(),
});
export type ExtractedRewardTier = z.infer<typeof ExtractedRewardTierSchema>;

export const ExtractedCardSchema = z.strictObject({
  /** The page's language. Text is extracted into this locale's slot only. */
  language: LocaleSchema,
  /** The page the card was extracted from (identity: bank + canonical URL). */
  canonicalUrl: url(),
  /** ISO 8601 timestamp of the extraction. */
  extractedAt: z.iso.datetime({ offset: true }),
  name: extractedField(BilingualTextSchema),
  /** The issuing bank as named on the page. */
  bankName: extractedField(BilingualTextSchema),
  rewardType: extractedField(RewardTypeSchema),
  network: extractedField(CardNetworkSchema),
  /** Only when the page states it. Never inferred. */
  shariaCompliant: extractedField(z.boolean()),
  /** SAR per month. */
  minMonthlyIncome: amountField(),
  fees: ExtractedFeesSchema,
  benefitsDescription: extractedField(BilingualTextSchema),
  rewardConditions: extractedField(BilingualTextSchema),
  eligibility: extractedField(BilingualTextSchema),
  /** In the order the page lists them. Empty when none are published. */
  rewardTiers: z.array(ExtractedRewardTierSchema),
});
export type ExtractedCard = z.infer<typeof ExtractedCardSchema>;

/** Payload of a `withdrawal` pending request (S-36): the card was absent 3 runs in a row. */
export const WithdrawalPayloadSchema = z.strictObject({
  canonicalUrl: url(),
  consecutiveAbsences: z.number().int().min(1),
  lastSeenAt: z.iso.datetime({ offset: true }).nullable(),
});
export type WithdrawalPayload = z.infer<typeof WithdrawalPayloadSchema>;

/** JSON Schema of ExtractedCard, for the model's structured-output parameter. */
export function extractedCardJsonSchema() {
  return z.toJSONSchema(ExtractedCardSchema);
}
