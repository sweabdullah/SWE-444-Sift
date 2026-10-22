/**
 * Checks that the seed contract in SEED.md holds. Run after `pnpm db:seed`:
 *   pnpm --filter @sift/db db:seed:check
 * Prints the counts and exits non-zero if any expectation fails.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const published = { status: "published" } as const;
  const counts = {
    banks: await prisma.bank.count(),
    bankEntryUrls: await prisma.bankEntryUrl.count(),
    sources: await prisma.source.count(),
    publishedCards: await prisma.card.count({ where: published }),
    archivedCards: await prisma.card.count({ where: { status: "archived" } }),
    publishedBanks: (await prisma.card.groupBy({ by: ["bankId"], where: published })).length,
    publishedWithArAndEn: await prisma.card.count({
      where: {
        ...published,
        AND: [
          { translations: { some: { locale: "ar" } } },
          { translations: { some: { locale: "en" } } },
        ],
      },
    }),
    cardsWith2PlusTiers: (await prisma.rewardTier.groupBy({ by: ["cardId"], _count: true })).filter(
      (g) => g._count >= 2,
    ).length,
    rewardTiers: await prisma.rewardTier.count(),
    shariaCompliant: await prisma.card.count({ where: { ...published, shariaCompliant: true } }),
    withMinIncome: await prisma.card.count({
      where: { ...published, minMonthlyIncome: { gt: 0 } },
    }),
    annualFeeZero: await prisma.fee.count({ where: { annualFee: 0 } }),
    annualFeeNull: await prisma.fee.count({ where: { annualFee: null } }),
    rewardTypes: (await prisma.card.groupBy({ by: ["rewardType"], where: published })).map(
      (g) => g.rewardType,
    ),
    figuresWithSource: await prisma.cardFieldSource.count(),
    pendingByStatus: Object.fromEntries(
      (await prisma.pendingRequest.groupBy({ by: ["kind", "status"], _count: true })).map((g) => [
        `${g.kind}/${g.status}`,
        g._count,
      ]),
    ),
    unnotifiedApprovedChangesOnShortlist: await prisma.cardChange.count({
      where: {
        notifiedAt: null,
        card: { shortlists: { some: { user: { email: "user@sift.local" } } } },
      },
    }),
    withdrawalOn3Absences: await prisma.pendingRequest.count({
      where: { kind: "withdrawal", card: { consecutiveAbsences: 3 } },
    }),
    succeededCrawlRunsLinked: await prisma.crawlRun.count({
      where: { status: "succeeded", pendingRequests: { some: {} } },
    }),
    admins: await prisma.user.count({ where: { role: "admin", emailVerified: { not: null } } }),
    registeredUsers: await prisma.user.count({
      where: { role: "user", emailVerified: { not: null } },
    }),
  };

  console.log(JSON.stringify(counts, null, 2));

  const failures: string[] = [];
  const expect = (ok: boolean, msg: string): void => {
    if (!ok) failures.push(msg);
  };
  expect(counts.banks >= 3, "at least 3 banks");
  expect(counts.publishedCards >= 5, "at least 5 published cards");
  expect(counts.publishedBanks >= 2, "published cards from at least 2 banks");
  expect(counts.publishedWithArAndEn === counts.publishedCards, "every published card has ar + en");
  expect(counts.archivedCards === 1, "exactly 1 archived card");
  expect(counts.cardsWith2PlusTiers >= 2, "at least 2 cards with 2+ reward tiers");
  expect(counts.shariaCompliant >= 1, "at least 1 Sharia-compliant card");
  expect(counts.withMinIncome >= 1, "at least 1 card with a minimum income");
  expect(counts.annualFeeZero >= 1, "at least 1 explicit 0 annual fee");
  expect(counts.annualFeeNull >= 1, "at least 1 NULL annual fee");
  expect(counts.pendingByStatus["new_card/pending"] === 1, "1 pending new_card");
  expect(counts.pendingByStatus["new_card/failed_validation"] === 1, "1 failed_validation");
  expect(counts.pendingByStatus["withdrawal/pending"] === 1, "1 pending withdrawal");
  expect(
    counts.unnotifiedApprovedChangesOnShortlist === 1,
    "1 un-notified change on a shortlisted card",
  );
  expect(counts.withdrawalOn3Absences === 1, "withdrawal on a card with 3 absences");
  expect(counts.succeededCrawlRunsLinked === 1, "1 succeeded crawl run linked to pending requests");
  expect(counts.admins === 1 && counts.registeredUsers === 1, "1 admin + 1 user, both verified");

  if (failures.length > 0) {
    console.error(`Seed check FAILED:\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Seed check passed.");
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
