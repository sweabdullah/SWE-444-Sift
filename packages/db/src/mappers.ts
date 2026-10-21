/**
 * Prisma row → @sift/schema shape. Internal to @sift/db (not exported from index).
 * Decimal → number happens here, at the edge. null stays null; 0 stays 0.
 */
import type { Prisma } from "@prisma/client";
import type { CardView, Locale, ValidationIssue } from "@sift/schema";
import { ValidationIssueSchema } from "@sift/schema";

/** Decimal | null → number | null. Never turns null into 0. */
export function num(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

/** Everything a CardView needs, in one include. */
export const cardViewInclude = {
  bank: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
  source: { select: { id: true, url: true, sourceType: true, fetchedAt: true } },
  fee: true,
  translations: true,
  rewardTiers: { orderBy: { sortOrder: "asc" }, include: { translations: true } },
} satisfies Prisma.CardInclude;

export type CardWithRelations = Prisma.CardGetPayload<{ include: typeof cardViewInclude }>;

/** The row in `locale`, else any other row (the caller flags the fallback). */
function pickLocale<T extends { locale: Locale }>(rows: T[], locale: Locale): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows[0];
}

export function toCardView(row: CardWithRelations, locale: Locale): CardView {
  const t = pickLocale(row.translations, locale);
  const translation = t
    ? {
        locale: t.locale,
        name: t.name,
        benefitsDescription: t.benefitsDescription,
        rewardConditions: t.rewardConditions,
        eligibility: t.eligibility,
        feeWaiverCondition: t.feeWaiverCondition,
      }
    : {
        // A published card should always have a translation; fall back to its neutral name.
        locale,
        name: row.normalisedName,
        benefitsDescription: null,
        rewardConditions: null,
        eligibility: null,
        feeWaiverCondition: null,
      };
  const fee = row.fee;
  return {
    id: row.id,
    bankId: row.bankId,
    canonicalUrl: row.canonicalUrl,
    normalisedName: row.normalisedName,
    status: row.status,
    rewardType: row.rewardType,
    network: row.network,
    shariaCompliant: row.shariaCompliant,
    minMonthlyIncome: num(row.minMonthlyIncome),
    sourceId: row.sourceId,
    verifiedAt: row.verifiedAt,
    publishedAt: row.publishedAt,
    archivedAt: row.archivedAt,
    bank: row.bank,
    translation,
    translationFallback: !t || t.locale !== locale,
    fees: {
      annualFee: fee ? num(fee.annualFee) : null,
      issuanceFee: fee ? num(fee.issuanceFee) : null,
      supplementaryCardFee: fee ? num(fee.supplementaryCardFee) : null,
      fxMarkupPct: fee ? num(fee.fxMarkupPct) : null,
      cashAdvanceFee: fee ? num(fee.cashAdvanceFee) : null,
      latePaymentFee: fee ? num(fee.latePaymentFee) : null,
      feeWaiverCondition: translation.feeWaiverCondition,
    },
    rewardTiers: row.rewardTiers.map((tier) => ({
      id: tier.id,
      rewardType: tier.rewardType,
      spendingCategory: tier.spendingCategory,
      rate: tier.rate.toNumber(),
      rateUnit: tier.rateUnit,
      cap: num(tier.cap),
      capPeriod: tier.capPeriod,
      minSpend: num(tier.minSpend),
      sortOrder: tier.sortOrder,
      condition: pickLocale(tier.translations, locale)?.condition ?? null,
    })),
    source: row.source,
  };
}

/** Read pending_request.validation_errors back into typed issues. */
export function toValidationIssues(value: Prisma.JsonValue | null): ValidationIssue[] | null {
  if (value === null) return null;
  const parsed = ValidationIssueSchema.array().safeParse(value);
  return parsed.success ? parsed.data : null;
}
