/** PostgreSQL-only regressions. Isolated local/CI database; every test transaction rolls back. */
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { sourceUrlCases } from "../../schema/test/source-cases.js";
import { normalizeSourceUrl } from "../../schema/src/source.js";

class Rollback extends Error {}
const prisma = new PrismaClient();
const prefix = "sft21_" + randomUUID().replaceAll("-", "");
const bankId = prefix + "_bank",
  sourceId = prefix + "_source",
  cardId = prefix + "_card";
const entryId = prefix + "_entry",
  otherBankId = prefix + "_other";
const verifiedAt = new Date("2026-10-21T09:00:00Z");

async function fixture(tx: Prisma.TransactionClient) {
  for (const id of [bankId, otherBankId]) {
    await tx.bank.create({
      data: {
        id,
        slug: id,
        nameAr: "بنك اختبار",
        nameEn: "Test bank",
        homepageUrl: "https://display.example/",
      },
    });
    await tx.bankEntryUrl.create({
      data: {
        id: id === bankId ? entryId : prefix + "_other_entry",
        bankId: id,
        url: "https://bank.example/cards",
      },
    });
  }
  await tx.source.create({
    data: {
      id: sourceId,
      bankId,
      url: "https://bank.example/cards/one",
      sourceType: "html",
      fetchedAt: verifiedAt,
    },
  });
  await tx.card.create({
    data: {
      id: cardId,
      bankId,
      sourceId,
      canonicalUrl: "https://bank.example/cards/one",
      normalisedName: "test card",
      rewardType: "none",
      status: "draft",
    },
  });
}
async function publish(tx: Prisma.TransactionClient) {
  await tx.card.update({ where: { id: cardId }, data: { status: "published", verifiedAt } });
}
async function scenario(
  name: string,
  rejected: readonly string[],
  operation: (tx: Prisma.TransactionClient) => Promise<unknown>,
) {
  let started = false;
  try {
    await prisma.$transaction(async (tx) => {
      await fixture(tx);
      started = true;
      await operation(tx);
      // Exercise deferred constraints BEFORE deliberately rolling the test back.
      await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
      throw new Rollback();
    });
  } catch (error) {
    if (error instanceof Rollback && rejected.length === 0) {
      console.log("PASS " + name);
      return;
    }
    if (
      started &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2010" &&
      rejected.includes(String(error.meta?.code))
    ) {
      console.log("PASS " + name);
      return;
    }
    throw new Error("FAIL " + name, { cause: error });
  }
  throw new Error("Unexpected commit: " + name);
}
async function main() {
  let hostname = "";
  try {
    hostname = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    /* guarded below */
  }
  if (
    process.env.SIFT_TEST_DATABASE !== "1" ||
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(hostname)
  )
    throw new Error("Use an isolated local PostgreSQL database and SIFT_TEST_DATABASE=1");
  for (const [input, host] of sourceUrlCases) {
    if (input.includes("\u0000")) continue;
    const normalized = normalizeSourceUrl(input);
    const candidate = normalized ?? input;
    const [row] = await prisma.$queryRaw<
      { origin: string | null }[]
    >`SELECT public.sift_http_origin(${candidate}) AS origin`;
    const expected = host && normalized ? new URL(normalized).origin : null;
    if (row?.origin !== expected)
      throw new Error("SQL URL policy differs: " + JSON.stringify(input));
  }
  await scenario("publish genuine verified source", [], publish);
  await scenario(
    "reject missing verification",
    ["23514"],
    (tx) => tx.$executeRaw`UPDATE card SET status='published' WHERE id=${cardId}`,
  );
  await scenario(
    "reject infinite verification",
    ["23514"],
    (tx) =>
      tx.$executeRaw`UPDATE card SET status='published', verified_at='infinity' WHERE id=${cardId}`,
  );
  await scenario("cannot clear published verification", ["23514"], async (tx) => {
    await publish(tx);
    await tx.$executeRaw`UPDATE card SET verified_at=NULL WHERE id=${cardId}`;
  });
  await scenario(
    "reject missing source",
    ["23503"],
    (tx) =>
      tx.$executeRaw`UPDATE card SET status='published', verified_at=${verifiedAt}, source_id='missing' WHERE id=${cardId}`,
  );
  await scenario(
    "reject cross-bank source",
    ["23503", "23514"],
    (tx) =>
      tx.$executeRaw`UPDATE card SET status='published', verified_at=${verifiedAt}, bank_id=${otherBankId} WHERE id=${cardId}`,
  );
  for (const url of [
    "",
    "javascript:alert(1)",
    "https://evil.com/cards",
    "https://xn--a.bank.example/cards",
    "https://user:password@bank.example/cards",
  ]) {
    await scenario("allow invalid draft source " + url, [], (tx) =>
      tx.source.update({ where: { id: sourceId }, data: { url } }),
    );
    await scenario("reject published source edit " + url, ["23514"], async (tx) => {
      await publish(tx);
      await tx.source.update({ where: { id: sourceId }, data: { url } });
    });
  }
  await scenario("archived sources remain editable", [], async (tx) => {
    await tx.card.update({ where: { id: cardId }, data: { status: "archived" } });
    await tx.source.update({ where: { id: sourceId }, data: { url: "" } });
  });
  await scenario("unpublish before clearing source", [], async (tx) => {
    await publish(tx);
    await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
    await tx.$executeRawUnsafe("SET CONSTRAINTS ALL DEFERRED");
    await tx.source.update({ where: { id: sourceId }, data: { url: "" } });
    await tx.card.update({ where: { id: cardId }, data: { status: "draft" } });
  });
  for (const sourceFirst of [true, false]) {
    await scenario("atomic domain transition, source first=" + sourceFirst, [], async (tx) => {
      await publish(tx);
      const source = () =>
        tx.source.update({
          where: { id: sourceId },
          data: { url: "https://new-bank.example/cards/one" },
        });
      const registration = () =>
        tx.bankEntryUrl.update({
          where: { id: entryId },
          data: { url: "https://new-bank.example/cards" },
        });
      if (sourceFirst) {
        await source();
        await registration();
      } else {
        await registration();
        await source();
      }
    });
  }
  await scenario("homepage widening grants no authority", ["23514"], async (tx) => {
    await publish(tx);
    await tx.bank.update({ where: { id: bankId }, data: { homepageUrl: "https://www.com/" } });
    await tx.source.update({ where: { id: sourceId }, data: { url: "https://evil.com/cards" } });
  });
  await scenario("changing display homepage alone is safe", [], async (tx) => {
    await publish(tx);
    await tx.bank.update({ where: { id: bankId }, data: { homepageUrl: "https://www.com/" } });
  });
  await scenario("cannot remove published authority", ["23514"], async (tx) => {
    await publish(tx);
    await tx.bankEntryUrl.delete({ where: { id: entryId } });
  });
  await scenario("reject source deletion", ["23503"], async (tx) => {
    await publish(tx);
    await tx.$executeRaw`DELETE FROM source WHERE id=${sourceId}`;
  });
  await scenario("valid edit preserves genuine date", [], async (tx) => {
    await publish(tx);
    await tx.source.update({
      where: { id: sourceId },
      data: { url: "https://bank.example/cards/updated" },
    });
    const card = await tx.card.findUniqueOrThrow({ where: { id: cardId } });
    if (card.verifiedAt?.getTime() !== verifiedAt.getTime())
      throw new Error("Verification date changed");
  });
  // CI's disposable PostgreSQL role can create these transaction-local test roles.
  // No privileges, roles, or fixtures survive rollback.
  const role = prefix + "_writer";
  const restrict = async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe('CREATE ROLE "' + role + '" NOLOGIN');
    await tx.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO "' + role + '"');
    await tx.$executeRawUnsafe('GRANT SELECT, INSERT, UPDATE ON public.source TO "' + role + '"');
    await tx.$executeRawUnsafe('SET LOCAL ROLE "' + role + '"');
  };
  await scenario("restricted writer needs no bank UPDATE", [], async (tx) => {
    await publish(tx);
    await restrict(tx);
    await tx.$executeRaw`UPDATE source SET url='https://bank.example/cards/updated' WHERE id=${sourceId}`;
  });
  await scenario("restricted writer cannot edit authority", ["42501"], async (tx) => {
    await restrict(tx);
    await tx.$executeRaw`UPDATE bank_entry_url SET url='https://evil.com/' WHERE id=${entryId}`;
  });
  await scenario("restricted writer cannot edit homepage", ["42501"], async (tx) => {
    await restrict(tx);
    await tx.$executeRaw`UPDATE bank SET homepage_url='https://www.com/' WHERE id=${bankId}`;
  });
  await scenario("restricted writer cannot edit private guard", ["42501"], async (tx) => {
    await restrict(tx);
    await tx.$executeRaw`UPDATE bank_source_guard SET revision=0 WHERE bank_id=${bankId}`;
  });
  console.log("Published-source constraints passed; all test writes rolled back.");
}
main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
