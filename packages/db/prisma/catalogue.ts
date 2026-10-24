/**
 * Inserts the card catalogue from seed-data.ts: banks, their entry URLs, sources, cards, fees,
 * translations, reward tiers and per-figure sources. Shared by the development seed (seed.ts,
 * every card plus the pipeline fixtures) and the production catalogue seed
 * (seed-catalogue.ts, published cards only, no users and no pipeline state).
 */
import type { Prisma } from "@prisma/client";

import { banks, sources, VERIFIED_AT, type SeedCard } from "./seed-data.js";

const FEE_COLUMNS = {
  annualFee: "fee.annual_fee",
  issuanceFee: "fee.issuance_fee",
  supplementaryCardFee: "fee.supplementary_card_fee",
  fxMarkupPct: "fee.fx_markup_pct",
  cashAdvanceFee: "fee.cash_advance_fee",
  latePaymentFee: "fee.late_payment_fee",
} as const;

export interface CatalogueOptions {
  /**
   * Keep the crawl state the development fixtures rely on (a card missing from 3 runs, for the
   * withdrawal request). Off for production, where no crawl has run yet.
   */
  pipelineState: boolean;
}

export async function insertCatalogue(
  tx: Prisma.TransactionClient,
  cards: SeedCard[],
  { pipelineState }: CatalogueOptions,
): Promise<void> {
  await tx.bank.createMany({
    data: banks.map(({ entryUrls: _entryUrls, ...bank }) => bank),
  });
  await tx.bankEntryUrl.createMany({
    data: banks.flatMap((b) =>
      b.entryUrls.map((url, i) => ({ id: `${b.id}_entry_${i}`, bankId: b.id, url })),
    ),
  });

  // The development seed needs every source (pending requests point at some); production only
  // the documents its cards cite.
  const cited = new Set(cards.flatMap((c) => [c.sourceId, ...Object.values(c.figureSources)]));
  await tx.source.createMany({
    data: sources
      .filter((s) => pipelineState || cited.has(s.id))
      .map((s) => ({ ...s, fetchedAt: VERIFIED_AT })),
  });

  for (const c of cards) {
    const consecutiveAbsences = pipelineState ? c.consecutiveAbsences : 0;
    await tx.card.create({
      data: {
        id: c.id,
        bankId: c.bankId,
        canonicalUrl: c.canonicalUrl,
        normalisedName: c.normalisedName,
        status: c.status,
        rewardType: c.rewardType,
        network: c.network,
        shariaCompliant: c.shariaCompliant,
        minMonthlyIncome: c.minMonthlyIncome,
        sourceId: c.sourceId,
        verifiedAt: VERIFIED_AT,
        consecutiveAbsences,
        lastSeenAt: consecutiveAbsences > 0 ? new Date("2026-10-18T08:00:00.000Z") : VERIFIED_AT,
        publishedAt: c.publishedAt,
        archivedAt: c.archivedAt,
        fee: { create: c.fee },
        translations: {
          create: [
            { id: `${c.id}_ar`, locale: "ar", ...c.ar },
            { id: `${c.id}_en`, locale: "en", ...c.en },
          ],
        },
      },
    });

    for (const [sortOrder, t] of c.tiers.entries()) {
      await tx.rewardTier.create({
        data: {
          id: `${c.id}_tier_${sortOrder}`,
          cardId: c.id,
          rewardType: t.rewardType,
          spendingCategory: t.spendingCategory,
          rate: t.rate,
          rateUnit: t.rateUnit,
          cap: t.cap,
          capPeriod: t.capPeriod,
          minSpend: t.minSpend,
          sortOrder,
          translations: {
            create: [
              { id: `${c.id}_tier_${sortOrder}_ar`, locale: "ar", condition: t.condition.ar },
              { id: `${c.id}_tier_${sortOrder}_en`, locale: "en", condition: t.condition.en },
            ],
          },
        },
      });
    }

    // One card_field_source row per published figure, so every figure has its URL.
    const fieldNames: string[] = [];
    for (const [key, field] of Object.entries(FEE_COLUMNS)) {
      if (c.fee[key as keyof typeof FEE_COLUMNS] !== null) fieldNames.push(field);
    }
    if (c.shariaCompliant !== null) fieldNames.push("card.sharia_compliant");
    if (c.minMonthlyIncome !== null) fieldNames.push("card.min_monthly_income");
    c.tiers.forEach((_t, i) => fieldNames.push(`reward_tier.${i}.rate`));
    await tx.cardFieldSource.createMany({
      data: fieldNames.map((fieldName) => ({
        id: `${c.id}_src_${fieldName}`,
        cardId: c.id,
        fieldName,
        sourceId: c.figureSources[fieldName] ?? c.sourceId,
      })),
    });
  }
}
