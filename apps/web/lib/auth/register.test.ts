import { describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@sift/db";
import { randomUUID } from "node:crypto";
import { registerAccount } from "./register";
import { hashPassword, verifyPassword } from "./password";

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
        password: "River stone lantern meadow!",
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
    expect(data.passwordHash).not.toBe("River stone lantern meadow!");
    expect(data.passwordHash).toMatch(/^\$sift\$scrypt\$v1\$/);
    expect(await verifyPassword("River stone lantern meadow!", data.passwordHash)).toBe(true);
  });
  it.each([
    ["short", "passwordRule"],
    ["a".repeat(129), "passwordTooLong"],
    ["password123", "commonPassword"],
    ["ع".repeat(16), "commonPassword"],
    [null, "passwordRule"],
  ])("rejects invalid password %j before a write", async (password, error) => {
    const { db, create } = database();
    expect(
      await registerAccount(db, { email: "person@example.com", password, locale: "en" }),
    ).toEqual({ ok: false, error });
    expect(create).not.toHaveBeenCalled();
  });
  it.each(["bad", "a@", "a b@example.com", null, "a".repeat(255) + "@example.com"])(
    "rejects invalid email %j",
    async (email) => {
      const { db, create } = database();
      expect(
        await registerAccount(db, {
          email,
          password: "River stone lantern meadow!",
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
        password: "River stone lantern meadow!",
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
        password: "River stone lantern meadow!",
        locale: "en",
      }),
    ).toEqual({ ok: false, error: "unavailable" });
  });
  it("salts independently and does not trim passwords", async () => {
    const password = "  a meaningful password  ";
    const a = await hashPassword(password),
      b = await hashPassword(password);
    expect(a).not.toBe(b);
    expect(await verifyPassword(password, a)).toBe(true);
    expect(await verifyPassword(password.trim(), a)).toBe(false);
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
        registerAccount(db, { email, password: "River stone lantern meadow!", locale: "ar" }),
        registerAccount(db, {
          email: email.toUpperCase(),
          password: "River stone lantern meadow!",
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
      expect(await verifyPassword("River stone lantern meadow!", user.passwordHash ?? "")).toBe(
        true,
      );
    } finally {
      await db.user.deleteMany({ where: { email } });
      await db.$disconnect();
    }
  },
);
