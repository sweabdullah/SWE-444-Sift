import { describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@sift/db";
import { compare, getRounds } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { registerAccount } from "./register";
import { hashPassword, PASSWORD_COST } from "./password";

function database() {
  const create = vi.fn().mockResolvedValue({ id: "new-user" });
  return { create, db: { user: { create } } as unknown as PrismaClient };
}
describe("registration boundary", () => {
  it("normalizes the email, hashes the password, and explicitly creates an unverified user", async () => {
    const { db, create } = database();
    expect(
      await registerAccount(db, {
        email: "  PERSON@Example.com  ",
        password: "correct horse battery staple",
        locale: "ar",
      }),
    ).toEqual({ ok: true, email: "person@example.com" });
    const call = create.mock.calls[0];
    if (!call) throw new Error("Missing registration write");
    const { data } = call[0];
    expect(data).toMatchObject({
      email: "person@example.com",
      locale: "ar",
      role: "user",
      emailVerified: null,
      digestOptIn: false,
    });
    expect(Object.keys(data).sort()).toEqual(
      ["email", "passwordHash", "locale", "role", "emailVerified", "digestOptIn"].sort(),
    );
    expect(data.passwordHash).not.toBe("correct horse battery staple");
    expect(getRounds(data.passwordHash)).toBe(PASSWORD_COST);
    expect(await compare("correct horse battery staple", data.passwordHash)).toBe(true);
  });
  it.each(["short", "a".repeat(14), "a".repeat(73), "ع".repeat(37), null])(
    "rejects invalid password %j before a write",
    async (password) => {
      const { db, create } = database();
      expect(
        await registerAccount(db, { email: "person@example.com", password, locale: "en" }),
      ).toEqual({ ok: false, error: "passwordRule" });
      expect(create).not.toHaveBeenCalled();
    },
  );
  it.each(["bad", "a@", "a b@example.com", null, "a".repeat(255) + "@example.com"])(
    "rejects invalid email %j",
    async (email) => {
      const { db, create } = database();
      expect(
        await registerAccount(db, {
          email,
          password: "correct horse battery staple",
          locale: "en",
        }),
      ).toEqual({ ok: false, error: "invalidEmail" });
      expect(create).not.toHaveBeenCalled();
    },
  );
  it("turns a unique-email race into the localized duplicate-email code", async () => {
    const { db, create } = database();
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6",
        meta: { target: ["email"] },
      }),
    );
    expect(
      await registerAccount(db, {
        email: "person@example.com",
        password: "correct horse battery staple",
        locale: "en",
      }),
    ).toEqual({ ok: false, error: "duplicateEmail" });
  });
  it("does not mislabel outages or other unique violations as an existing email", async () => {
    const { db, create } = database();
    create.mockRejectedValue(new Error("database offline"));
    expect(
      await registerAccount(db, {
        email: "person@example.com",
        password: "correct horse battery staple",
        locale: "en",
      }),
    ).toEqual({ ok: false, error: "unavailable" });
  });
  it("salts independently and does not trim passwords", async () => {
    const password = "  a meaningful password  ";
    const a = await hashPassword(password),
      b = await hashPassword(password);
    expect(a).not.toBe(b);
    expect(await compare(password, a)).toBe(true);
    expect(await compare(password.trim(), a)).toBe(false);
  });
});

it.skipIf(!process.env.SIFT_AUTH_TEST_DATABASE_URL)(
  "uses the real unique constraint for simultaneous registration and preserves schema defaults",
  async () => {
    const url = process.env.SIFT_AUTH_TEST_DATABASE_URL;
    if (
      !url ||
      !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
      !new URL(url).pathname.endsWith("_auth_spike_test")
    )
      throw new Error("Expected a disposable localhost *_auth_spike_test database");
    const db = new PrismaClient({ datasourceUrl: url });
    const email = `sft38-${randomUUID()}@example.com`;
    try {
      const results = await Promise.all([
        registerAccount(db, { email, password: "correct horse battery staple", locale: "ar" }),
        registerAccount(db, {
          email: email.toUpperCase(),
          password: "correct horse battery staple",
          locale: "ar",
        }),
      ]);
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results).toContainEqual({ ok: false, error: "duplicateEmail" });
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      expect(user).toMatchObject({
        role: "user",
        emailVerified: null,
        digestOptIn: false,
        locale: "ar",
      });
      expect(await compare("correct horse battery staple", user.passwordHash ?? "")).toBe(true);
    } finally {
      await db.user.deleteMany({ where: { email } });
      await db.$disconnect();
    }
  },
);
