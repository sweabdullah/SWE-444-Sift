/**
 * Integration tests for the data-access layer. They run against DATABASE_URL (CI provides
 * one; locally put it in packages/db/.env) after `prisma migrate deploy`, and skip with a
 * message when no database is configured. Every row they create uses a unique bank slug and
 * is deleted afterwards, so they are safe on a seeded database.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  // No .env file: rely on the environment (CI sets DATABASE_URL).
}

const hasDb = Boolean(process.env.DATABASE_URL);
if (!hasDb) {
  console.warn(
    "[@sift/db] DATABASE_URL is not set — skipping database tests. " +
      "Set it in packages/db/.env and run `pnpm db:deploy` to run them.",
  );
}

describe.skipIf(!hasDb)("data access (database)", async () => {
  const db = await import("../src/index.js");
  const { prisma } = db;
  const tag = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ids = {
    bank: "",
    source: "",
    published: "",
    draft: "",
    unknownFee: "",
    user: "",
  };

  beforeAll(async () => {
    const bank = await prisma.bank.create({
      data: {
        slug: tag,
        nameAr: `بنك ${tag}`,
        nameEn: `Bank ${tag}`,
        homepageUrl: "https://bank.example",
      },
    });
    ids.bank = bank.id;
    const source = await prisma.source.create({
      data: {
        bankId: bank.id,
        url: "https://bank.example/cards",
        sourceType: "html",
        fetchedAt: new Date(),
      },
    });
    ids.source = source.id;

    const card = (name: string, status: "published" | "draft", annualFee: number | null) =>
      prisma.card.create({
        data: {
          bankId: bank.id,
          sourceId: source.id,
          canonicalUrl: `https://bank.example/cards/${name}`,
          normalisedName: `${tag} ${name}`,
          status,
          rewardType: "cashback",
          publishedAt: status === "published" ? new Date() : null,
          fee: {
            create: {
              annualFee,
              issuanceFee: null,
              supplementaryCardFee: 0,
              fxMarkupPct: 2.75,
            },
          },
          translations: {
            create: [
              { locale: "en", name: `${tag} ${name} card` },
              ...(name === "free" ? [{ locale: "ar" as const, name: `بطاقة ${tag} مجانية` }] : []),
            ],
          },
          rewardTiers: {
            create: [
              {
                rewardType: "cashback",
                spendingCategory: "general",
                rate: name === "free" ? 1.5 : 3,
                rateUnit: "percent",
                sortOrder: 0,
              },
            ],
          },
        },
      });

    ids.published = (await card("free", "published", 0)).id;
    ids.draft = (await card("hidden", "draft", 0)).id;
    ids.unknownFee = (await card("unknown", "published", null)).id;

    const user = await prisma.user.create({ data: { email: `${tag}@example.test` } });
    ids.user = user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: ids.user } });
    await prisma.pendingRequest.deleteMany({ where: { bankId: ids.bank } });
    await prisma.crawlRun.deleteMany({ where: { bankId: ids.bank } });
    await prisma.card.deleteMany({ where: { bankId: ids.bank } });
    await prisma.source.deleteMany({ where: { bankId: ids.bank } });
    await prisma.bank.deleteMany({ where: { id: ids.bank } });
    await prisma.$disconnect();
  });

  it("listPublishedCards never returns a draft", async () => {
    const page = await db.listPublishedCards({ q: tag, pageSize: 100 });
    const got = page.items.map((c) => c.id);
    expect(got).toContain(ids.published);
    expect(got).toContain(ids.unknownFee);
    expect(got).not.toContain(ids.draft);
    expect(page.items.every((c) => c.status === "published")).toBe(true);
    expect(page.total).toBe(2);
  });

  it("getCard and getCardsForComparison hide drafts", async () => {
    expect(await db.getCard(ids.draft, "en")).toBeNull();
    expect(await db.getCard(ids.published, "en")).not.toBeNull();
    const compared = await db.getCardsForComparison([ids.unknownFee, ids.draft, ids.published]);
    expect(compared.map((c) => c.id)).toEqual([ids.unknownFee, ids.published]);
    await expect(db.getCardsForComparison(["a", "b", "c", "d", "e"])).rejects.toThrow();
  });

  it("keeps fee null distinct from 0 through the round trip", async () => {
    const free = await db.getCard(ids.published, "en");
    const unknown = await db.getCard(ids.unknownFee, "en");
    expect(free?.fees.annualFee).toBe(0);
    expect(free?.fees.supplementaryCardFee).toBe(0);
    expect(free?.fees.issuanceFee).toBeNull();
    expect(free?.fees.cashAdvanceFee).toBeNull();
    expect(free?.fees.fxMarkupPct).toBe(2.75);
    expect(unknown?.fees.annualFee).toBeNull();
  });

  it("returns the requested locale, or flags the fallback", async () => {
    const ar = await db.getCard(ids.published, "ar");
    expect(ar?.translation.locale).toBe("ar");
    expect(ar?.translationFallback).toBe(false);
    const fallback = await db.getCard(ids.unknownFee, "ar");
    expect(fallback?.translation.locale).toBe("en");
    expect(fallback?.translationFallback).toBe(true);
  });

  it("fee filter excludes unpublished fees and counts them; zero fee is included", async () => {
    const page = await db.listPublishedCards({ q: tag, maxAnnualFee: 0 });
    expect(page.items.map((c) => c.id)).toEqual([ids.published]);
    expect(page.excludedUnknown.annualFee).toBe(1);
    expect(page.excludedUnknown.minMonthlyIncome).toBeNull();
  });

  it("annual_fee_asc puts unknown fees last; reward_rate_desc orders by max rate", async () => {
    const byFee = await db.listPublishedCards({ q: tag, sort: "annual_fee_asc" });
    expect(byFee.items.map((c) => c.id)).toEqual([ids.published, ids.unknownFee]);
    const byRate = await db.listPublishedCards({ q: tag, sort: "reward_rate_desc" });
    expect(byRate.items.map((c) => c.id)).toEqual([ids.unknownFee, ids.published]);
  });

  it("searches Arabic content ignoring diacritics in the query", async () => {
    const page = await db.listPublishedCards({ q: "مَجّانية" });
    expect(page.items.map((c) => c.id)).toContain(ids.published);
  });

  it("shortlist: only published cards can be saved; removal works", async () => {
    expect(await db.addToShortlist(ids.user, ids.draft)).toBeNull();
    expect(await db.addToShortlist(ids.user, ids.published)).not.toBeNull();
    expect(await db.addToShortlist(ids.user, ids.published)).not.toBeNull(); // idempotent
    const list = await db.getShortlist(ids.user, "en");
    expect(list.map((i) => i.cardId)).toEqual([ids.published]);
    expect(list[0]?.card?.id).toBe(ids.published);
    expect(await db.removeFromShortlist(ids.user, ids.published)).toBe(true);
    expect(await db.getShortlist(ids.user)).toEqual([]);
  });

  it("ingest: crawl run lifecycle and pending requests (valid vs failed validation)", async () => {
    const run = await db.recordCrawlRun({ bankId: ids.bank, trigger: "manual" });
    expect(run.status).toBe("running");
    const done = await db.finishCrawlRun(run.id, {
      status: "succeeded",
      pagesFetched: 3,
      cardsFound: 1,
    });
    expect(done.finishedAt).not.toBeNull();

    const page = "https://bank.example/cards/new";
    const none = { value: null, sourceUrl: null };
    const valid = {
      language: "en",
      canonicalUrl: page,
      extractedAt: "2026-10-21T10:00:00Z",
      name: { value: { ar: null, en: "New card" }, sourceUrl: page },
      bankName: { value: { ar: null, en: "Bank" }, sourceUrl: page },
      rewardType: none,
      network: none,
      shariaCompliant: none,
      minMonthlyIncome: none,
      fees: {
        annualFee: { value: 0, sourceUrl: page },
        issuanceFee: none,
        supplementaryCardFee: none,
        fxMarkupPct: none,
        cashAdvanceFee: none,
        latePaymentFee: none,
        feeWaiverCondition: none,
      },
      benefitsDescription: none,
      rewardConditions: none,
      eligibility: none,
      rewardTiers: [],
    };
    const ok = await db.createPendingRequest({
      kind: "new_card",
      bankId: ids.bank,
      sourceId: ids.source,
      crawlRunId: run.id,
      payload: valid,
    });
    expect(ok.status).toBe("pending");
    expect(ok.validationErrors).toBeNull();

    const raw = {
      ...valid,
      fees: { ...valid.fees, annualFee: { value: "free", sourceUrl: page } },
    };
    const bad = await db.createPendingRequest({
      kind: "new_card",
      bankId: ids.bank,
      sourceId: ids.source,
      payload: raw,
    });
    expect(bad.status).toBe("failed_validation");
    expect(bad.validationErrors?.[0]?.path).toBe("fees.annualFee.value");
    expect(bad.payload).toEqual(raw); // raw response retained (S-45)

    const queue = await db.listPendingRequests({ bankId: ids.bank });
    expect(queue.map((r) => r.id)).toEqual([ok.id, bad.id]); // oldest first
    expect(queue[0]?.source.url).toBe("https://bank.example/cards");
    expect(queue[0]?.crawlRun?.id).toBe(run.id);

    const detail = await db.getPendingRequest(ok.id);
    expect(detail?.extracted?.fees.annualFee.value).toBe(0);
    expect((await db.getPendingRequest(bad.id))?.extracted).toBeNull();

    // A pending request never shows up in a public query.
    const pub = await db.listPublishedCards({ q: "New card" });
    expect(pub.items.some((c) => c.canonicalUrl === page)).toBe(false);
  });

  it("listBanks and listCardChanges return typed rows", async () => {
    const banks = await db.listBanks();
    expect(banks.some((b) => b.id === ids.bank)).toBe(true);
    const changes = await db.listCardChanges({ cardId: ids.published, notified: false });
    expect(changes).toEqual([]);
  });
});
