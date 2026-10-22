/**
 * Development seed (SFT-11 / T-7). Run with `pnpm db:seed` (or `prisma db seed`).
 *
 * Idempotent: everything runs in one transaction that first TRUNCATEs every Sift table
 * and then inserts the fixed records from seed-data.ts with stable IDs. Running it twice
 * leaves the same rows. It wipes local data, so it refuses to run with NODE_ENV=production.
 *
 * What is seeded and why: ../SEED.md.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  approvedChange,
  banks,
  cards,
  crawlRun,
  DEV_PASSWORD,
  failedPayload,
  failedValidationErrors,
  newCardPayload,
  shortlist,
  sources,
  users,
  VERIFIED_AT,
} from "./seed-data.js";

const TABLES = [
  "card_change",
  "pending_request",
  "crawl_run",
  "shortlist",
  "verification_token",
  "session",
  "account",
  "user",
  "reward_tier_translation",
  "reward_tier",
  "card_field_source",
  "card_translation",
  "fee",
  "card",
  "source",
  "bank_entry_url",
  "bank",
];

const FEE_COLUMNS = {
  annualFee: "fee.annual_fee",
  issuanceFee: "fee.issuance_fee",
  supplementaryCardFee: "fee.supplementary_card_fee",
  fxMarkupPct: "fee.fx_markup_pct",
  cashAdvanceFee: "fee.cash_advance_fee",
  latePaymentFee: "fee.late_payment_fee",
} as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV=production. The seed truncates every table.");
  }

  const prisma = new PrismaClient();
  // Hash outside the transaction; bcryptjs is a well-known pure-JS bcrypt.
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(
          `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
        );

        // Banks and their registered entry URLs.
        await tx.bank.createMany({
          data: banks.map(({ entryUrls: _entryUrls, ...bank }) => bank),
        });
        await tx.bankEntryUrl.createMany({
          data: banks.flatMap((b) =>
            b.entryUrls.map((url, i) => ({ id: `${b.id}_entry_${i}`, bankId: b.id, url })),
          ),
        });

        await tx.source.createMany({
          data: sources.map((s) => ({ ...s, fetchedAt: VERIFIED_AT })),
        });

        // Cards and everything hanging off them.
        for (const c of cards) {
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
              consecutiveAbsences: c.consecutiveAbsences,
              lastSeenAt:
                c.consecutiveAbsences > 0 ? new Date("2026-10-18T08:00:00.000Z") : VERIFIED_AT,
              publishedAt: c.publishedAt,
              archivedAt: c.archivedAt,
              fee: { create: c.fee },
              translations: {
                create: [
                  { locale: "ar", ...c.ar },
                  { locale: "en", ...c.en },
                ],
              },
            },
          });

          for (const [sortOrder, t] of c.tiers.entries()) {
            await tx.rewardTier.create({
              data: {
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
                    { locale: "ar", condition: t.condition.ar },
                    { locale: "en", condition: t.condition.en },
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
              cardId: c.id,
              fieldName,
              sourceId: c.figureSources[fieldName] ?? c.sourceId,
            })),
          });
        }

        // Users (DEV-ONLY password) and the registered user's shortlist.
        await tx.user.createMany({
          data: users.map((u) => ({ ...u, emailVerified: VERIFIED_AT, passwordHash })),
        });
        await tx.shortlist.createMany({ data: shortlist });

        // Pipeline: one succeeded crawl run and the four kinds of pending request.
        await tx.crawlRun.create({ data: crawlRun });

        await tx.pendingRequest.create({
          data: {
            id: "pr_new_card_enbd_platinum",
            kind: "new_card",
            status: "pending",
            bankId: "bank_enbd_ksa",
            crawlRunId: crawlRun.id,
            sourceId: "src_enbd_platinum",
            payload: newCardPayload as Prisma.InputJsonObject,
            createdAt: crawlRun.finishedAt,
          },
        });
        await tx.pendingRequest.create({
          data: {
            id: "pr_failed_enbd_mazeed",
            kind: "new_card",
            status: "failed_validation",
            bankId: "bank_enbd_ksa",
            crawlRunId: crawlRun.id,
            sourceId: "src_enbd_mazeed",
            payload: failedPayload as Prisma.InputJsonObject,
            validationErrors: failedValidationErrors as Prisma.InputJsonArray,
            createdAt: crawlRun.finishedAt,
          },
        });

        const approvedAt = new Date("2026-10-20T10:00:00.000Z");
        await tx.pendingRequest.create({
          data: {
            id: "pr_field_change_riyad_titanium",
            kind: "field_change",
            status: "approved",
            bankId: "bank_riyad",
            cardId: "card_riyad_titanium",
            sourceId: "src_riyad_titanium",
            payload: { changes: [{ ...approvedChange, locale: null }] },
            createdAt: new Date("2026-10-20T08:00:00.000Z"),
            reviewedById: "user_admin",
            reviewedAt: approvedAt,
            reviewNote: "Seed fixture: approved annual-fee change (old value is synthetic).",
          },
        });
        await tx.cardChange.create({
          data: {
            id: "change_riyad_titanium_annual_fee",
            cardId: "card_riyad_titanium",
            pendingRequestId: "pr_field_change_riyad_titanium",
            fieldName: approvedChange.fieldName,
            locale: null,
            oldValue: approvedChange.oldValue,
            newValue: approvedChange.newValue,
            approvedAt,
            notifiedAt: null,
          },
        });

        await tx.pendingRequest.create({
          data: {
            id: "pr_withdrawal_snb_alfursan_platinum",
            kind: "withdrawal",
            status: "pending",
            bankId: "bank_snb",
            cardId: "card_snb_alfursan_platinum",
            sourceId: "src_snb_alfursan_platinum",
            payload: {
              reason: "Card not found in 3 consecutive crawl runs.",
              consecutiveAbsences: 3,
              lastSeenAt: "2026-10-18T08:00:00.000Z",
            },
            createdAt: VERIFIED_AT,
          },
        });
      },
      { timeout: 60_000 },
    );

    const [published, archived, pending] = await Promise.all([
      prisma.card.count({ where: { status: "published" } }),
      prisma.card.count({ where: { status: "archived" } }),
      prisma.pendingRequest.count(),
    ]);
    console.log(
      `Seeded ${banks.length} banks, ${published} published + ${archived} archived cards, ${pending} pending requests, ${users.length} users.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
