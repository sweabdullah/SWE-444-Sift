import { describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@sift/db";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import { safeReturnTo } from "./return-to";
import { revokeCookieSession } from "./revoke";
import { createAuthConfig, AUTH_MAX_AGE, sessionCookieName } from "./config";
import { registerAccount } from "./register";
import { authClient } from "@/test/auth-client";

describe("return-to-page validation", () => {
  it.each([
    "https://attacker.example/en/cards/a",
    "//attacker.example/en",
    "/en\\evil",
    "/en/%2f%2fattacker",
    "/en/%5cevil",
    "/api/auth/session",
    "/en/login",
    "/en/%6cogin",
    "/en/register?a=1",
    "/en/logout",
    "/fr/cards/a",
    "\n/en/cards/a",
    null,
    ["/en/cards/a"],
  ])("rejects unsafe or looping destination %j", (value) => {
    expect(safeReturnTo(value, "en")).toBe("/en/account");
  });
  it("preserves the originating card and query string", () => {
    expect(safeReturnTo("/en/cards/card_riyad_titanium?from=shortlist#fees", "en")).toBe(
      "/en/cards/card_riyad_titanium?from=shortlist#fees",
    );
  });
  it("keeps the same page when locale changes", () => {
    expect(safeReturnTo("/ar/cards/a?sort=fee", "en")).toBe("/en/cards/a?sort=fee");
  });
});

describe("server revocation before cookie clearing", () => {
  const secret = "sft39-test-secret-at-least-32-bytes-long-0123456789";
  it("deletes only the session matching this validated cookie and user", async () => {
    const token = await encode({
      secret,
      salt: sessionCookieName(),
      token: { sid: "own-session", sub: "own-user" },
    });
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = { session: { deleteMany } } as unknown as PrismaClient;
    await revokeCookieSession(
      db,
      new Headers({ cookie: `${sessionCookieName()}=${token}` }),
      secret,
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: { sessionToken: "own-session", userId: "own-user" },
    });
  });
  it("ignores forged cookies and bearer tokens for revocation", async () => {
    const deleteMany = vi.fn();
    const db = { session: { deleteMany } } as unknown as PrismaClient;
    await revokeCookieSession(
      db,
      new Headers({ cookie: `${sessionCookieName()}=forged`, authorization: "Bearer forged" }),
      secret,
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });
  it("propagates database failures so callers can retain the cookie and report failure", async () => {
    const token = await encode({
      secret,
      salt: sessionCookieName(),
      token: { sid: "own-session", sub: "own-user" },
    });
    const db = {
      session: { deleteMany: vi.fn().mockRejectedValue(new Error("offline")) },
    } as unknown as PrismaClient;
    await expect(
      revokeCookieSession(db, new Headers({ cookie: `${sessionCookieName()}=${token}` }), secret),
    ).rejects.toThrow("offline");
  });
});

it.skipIf(!process.env.SIFT_AUTH_TEST_DATABASE_URL)(
  "keeps a persistent account session, invalidates copied cookies, and does not reveal missing emails",
  async () => {
    const url = process.env.SIFT_AUTH_TEST_DATABASE_URL;
    if (
      !url ||
      !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
      !new URL(url).pathname.endsWith("_auth_spike_test")
    )
      throw new Error("Expected a disposable localhost *_auth_spike_test database");
    const db = new PrismaClient({ datasourceUrl: url });
    const email = `sft39-${randomUUID()}@example.com`;
    try {
      expect(
        (
          await registerAccount(db, {
            email,
            password: "River stone lantern meadow!",
            locale: "en",
          })
        ).ok,
      ).toBe(true);
      const client = authClient(createAuthConfig(db));
      const response = await client.login(email, "River stone lantern meadow!");
      expect(response.headers.getSetCookie().join(";")).toContain("Expires=");
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      const row = await db.session.findFirstOrThrow({ where: { userId: user.id } });
      expect(row.expires.getTime()).toBeGreaterThan(Date.now() + (AUTH_MAX_AGE - 10) * 1000);
      const cookie = client.cookie();
      expect((await authClient(createAuthConfig(db), cookie).session())?.user.id).toBe(user.id);
      await client.logout();
      expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
      expect(await authClient(createAuthConfig(db), cookie).session()).toBeNull();
      const wrong = await client.login(email, "incorrect password");
      const missing = await client.login(
        `missing-${randomUUID()}@example.com`,
        "incorrect password",
      );
      expect(wrong.headers.get("location")).toBe(missing.headers.get("location"));
    } finally {
      await db.user.deleteMany({ where: { email } });
      await db.$disconnect();
    }
  },
);
