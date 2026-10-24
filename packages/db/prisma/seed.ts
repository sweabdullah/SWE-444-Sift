/**
 * Development seed (SFT-11 / T-7). Run with `pnpm db:seed` (or `prisma db seed`).
 *
 * Idempotent: everything runs in one transaction that first TRUNCATEs every Sift table
 * and then inserts the fixed records from seed-data.ts with stable IDs. Running it twice
 * leaves the same rows (all IDs are deterministic). It wipes the database, so it refuses to run
 * with NODE_ENV=production, and refuses a non-local DATABASE_URL unless SIFT_ALLOW_SEED=1.
 *
 * What is seeded and why: ../SEED.md.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { insertCatalogue } from "./catalogue.js";
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

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed: NODE_ENV=production. The seed truncates every table.");
  }
  if (!isLocalDatabase(process.env.DATABASE_URL) && process.env.SIFT_ALLOW_SEED !== "1") {
    throw new Error(
      "Refusing to seed: DATABASE_URL is not localhost/127.0.0.1. The seed truncates every table; set SIFT_ALLOW_SEED=1 to override.",
    );
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

        // Banks, sources and every card (published and archived), with the crawl state the
        // pipeline fixtures below rely on.
        await insertCatalogue(tx, cards, { pipelineState: true });

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
            reviewNote:
              "SYNTHETIC seed fixture: approved annual-fee change; the old value 250.00 is made up.",
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

function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
