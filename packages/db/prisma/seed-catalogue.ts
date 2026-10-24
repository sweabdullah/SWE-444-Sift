/**
 * Production catalogue seed. Run with `pnpm --filter @sift/db db:seed:catalogue`.
 *
 * Loads only the PUBLISHED cards from seed-data.ts, with their banks, sources, fees,
 * translations, reward tiers and per-figure sources. Unlike the development seed it creates no
 * users, no passwords, no shortlists, no crawl runs and no pending requests, and it never
 * deletes anything: if the database already holds a bank, a card or a source it does nothing and exits
 * cleanly, so the deploy workflow can run it on every deploy. From the first real admin edit
 * onwards, the database, not this file, is the source of truth.
 *
 * What is loaded and where every figure comes from: ../SEED.md.
 */
import { PrismaClient } from "@prisma/client";

import { insertCatalogue } from "./catalogue.js";
import { cards } from "./seed-data.js";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const [existingBanks, existingCards, existingSources] = await Promise.all([
      prisma.bank.count(),
      prisma.card.count(),
      prisma.source.count(),
    ]);
    if (existingBanks > 0 || existingCards > 0 || existingSources > 0) {
      console.log(
        `Catalogue seed skipped: the database already has ${existingBanks} banks, ${existingCards} cards and ${existingSources} sources.`,
      );
      return;
    }

    const published = cards.filter((c) => c.status === "published");
    await prisma.$transaction((tx) => insertCatalogue(tx, published, { pipelineState: false }), {
      timeout: 60_000,
    });

    const [bankCount, cardCount] = await Promise.all([
      prisma.bank.count(),
      prisma.card.count({ where: { status: "published" } }),
    ]);
    console.log(`Catalogue seeded: ${bankCount} banks, ${cardCount} published cards.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
