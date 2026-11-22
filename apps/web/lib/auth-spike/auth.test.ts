import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import { NextRequest } from "next/server";
import { PrismaClient, type User, type Session as DbSession } from "@sift/db";
import {
  createSpikeConfig,
  createSpikeSignOutAttempt,
  spikeEnabled,
  SPIKE_COOKIE,
  SPIKE_MAX_AGE,
} from "./config";
import { spikeAccessStatus } from "./access";

const secret = "sft-41-test-only-secret-not-for-deployment-0123456789";
const origin = "http://localhost:3000";
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hash("sift-dev-password", 10);
});

function makeUser(role: "user" | "admin"): User {
  return {
    id: role,
    email: `${role}@sift.local`,
    name: role,
    image: null,
    passwordHash,
    role,
    locale: "ar",
    emailVerified: null,
    digestOptIn: false,
    unsubscribeToken: `private-${role}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function memoryDatabase() {
  const users = new Map([makeUser("user"), makeUser("admin")].map((user) => [user.id, user]));
  const sessions = new Map<string, DbSession>();
  const userFind = vi.fn(
    async ({ where }: { where: { email: string } }) =>
      [...users.values()].find((user) => user.email === where.email) ?? null,
  );
  const sessionFind = vi.fn(async ({ where }: { where: { sessionToken: string } }) => {
    const session = sessions.get(where.sessionToken);
    const user = session && users.get(session.userId);
    return session && user ? { ...session, user } : null;
  });
  const sessionCreate = vi.fn(
    async ({ data }: { data: Pick<DbSession, "sessionToken" | "userId" | "expires"> }) => {
      const row = { ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() };
      sessions.set(row.sessionToken, row);
      return row;
    },
  );
  const sessionDelete = vi.fn(async ({ where }: { where: { sessionToken: string } }) => ({
    count: Number(sessions.delete(where.sessionToken)),
  }));
  // Only the Prisma operations exercised by the real PrismaAdapter and spike callbacks.
  const db = {
    user: { findUnique: userFind },
    session: { findUnique: sessionFind, create: sessionCreate, deleteMany: sessionDelete },
  } as unknown as PrismaClient;
  return { db, users, sessions, userFind, sessionFind, sessionCreate, sessionDelete };
}

function browser(config: NextAuthConfig, initialCookie = "") {
  const jar = new Map(
    initialCookie
      .split("; ")
      .filter(Boolean)
      .map((pair) => {
        const split = pair.indexOf("=");
        return [pair.slice(0, split), pair.slice(split + 1)];
      }),
  );
  const auth = NextAuth({
    ...config,
    secret,
    trustHost: true,
    logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  });
  const cookie = () => [...jar].map(([key, value]) => `${key}=${value}`).join("; ");
  async function request(action: string, data?: Record<string, string>) {
    const req = new NextRequest(`${origin}/api/auth-spike/${action}`, {
      method: data ? "POST" : "GET",
      headers: {
        cookie: cookie(),
        ...(data ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: data ? new URLSearchParams(data) : undefined,
    });
    const response = await (data ? auth.handlers.POST(req) : auth.handlers.GET(req));
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(";")[0] ?? "";
      const split = pair.indexOf("=");
      jar.set(pair.slice(0, split), pair.slice(split + 1));
    }
    return response;
  }
  async function csrf() {
    const response = await request("csrf");
    return ((await response.json()) as { csrfToken: string }).csrfToken;
  }
  return {
    cookie,
    request,
    async login(email = "user@sift.local", password = "sift-dev-password") {
      return request("callback/credentials", {
        email,
        password,
        csrfToken: await csrf(),
        callbackUrl: `${origin}/en/auth-spike`,
      });
    },
    async session(): Promise<Session | null> {
      return (await (await request("session")).json()) as Session | null;
    },
    async logout() {
      return request("signout", {
        csrfToken: await csrf(),
        callbackUrl: `${origin}/en/auth-spike`,
      });
    },
  };
}

describe("Auth.js Credentials with a revocable Prisma session", () => {
  let state: ReturnType<typeof memoryDatabase>;
  let client: ReturnType<typeof browser>;
  beforeEach(() => {
    state = memoryDatabase();
    client = browser(createSpikeConfig(state.db, () => true));
  });

  it("creates a session through PrismaAdapter and exposes only safe session fields", async () => {
    const response = await client.login();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${origin}/en/auth-spike`);
    expect(state.sessionCreate).toHaveBeenCalledOnce();
    expect(state.sessions.size).toBe(1);
    const row = [...state.sessions.values()][0];
    expect(row?.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(row?.expires.getTime()).toBeGreaterThan(Date.now() + (SPIKE_MAX_AGE - 10) * 1000);
    const cookies = response.headers.getSetCookie().join(";");
    expect(cookies).toContain(`${SPIKE_COOKIE}=`);
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=Lax");
    expect(cookies).toContain("Expires=");
    const session = await client.session();
    expect(session?.user).toMatchObject({ id: "user", role: "user", email: "user@sift.local" });
    expect(JSON.stringify(session)).not.toMatch(/passwordHash|unsubscribeToken|sessionToken|sid/);
    expect(session?.expires).toBe(row?.expires.toISOString());
    expect(spikeAccessStatus(session, "user")).toBe(200);
  });

  it("returns 401 for a visitor and 403 for an ordinary user on an admin resource", async () => {
    expect(spikeAccessStatus(await client.session(), "user")).toBe(401);
    await client.login();
    expect(spikeAccessStatus(await client.session(), "admin")).toBe(403);
    await client.login("admin@sift.local");
    expect(spikeAccessStatus(await client.session(), "admin")).toBe(200);
  });

  it("keeps a session in a new browser context using only the persistent cookie", async () => {
    await client.login();
    const reopened = browser(
      createSpikeConfig(state.db, () => true),
      client.cookie(),
    );
    expect((await reopened.session())?.user.id).toBe("user");
  });

  it("deletes the server row at sign-out and rejects replay of the previously valid cookie", async () => {
    await client.login();
    const savedCookie = client.cookie();
    await client.logout();
    expect(state.sessions.size).toBe(0);
    expect(await client.session()).toBeNull();
    const replay = browser(
      createSpikeConfig(state.db, () => true),
      savedCookie,
    );
    expect(await replay.session()).toBeNull();
  });

  it("reloads role changes instead of trusting the old JWT", async () => {
    await client.login("admin@sift.local");
    const admin = state.users.get("admin");
    if (!admin) throw new Error("missing fixture");
    admin.role = "user";
    expect(spikeAccessStatus(await client.session(), "admin")).toBe(403);
  });

  it("rejects expiry, explicit revocation, and deleted users", async () => {
    await client.login();
    for (const row of state.sessions.values()) row.expires = new Date(0);
    expect(await client.session()).toBeNull();
    await client.login();
    state.sessions.clear();
    expect(await client.session()).toBeNull();
    await client.login();
    state.users.clear();
    expect(await client.session()).toBeNull();
  });

  it("fails closed if the database is unavailable", async () => {
    await client.login();
    state.sessionFind.mockRejectedValueOnce(new Error("database offline"));
    expect(await client.session()).toBeNull();
  });

  it("does not allow a session row belonging to another user", async () => {
    await client.login();
    for (const row of state.sessions.values()) row.userId = "admin";
    expect(await client.session()).toBeNull();
  });

  it("does not accept client-supplied roles or session updates", async () => {
    await client.login();
    await client.request("session", {
      csrfToken: (await (await client.request("csrf")).json()).csrfToken,
      data: JSON.stringify({ role: "admin", user: { role: "admin" } }),
    });
    expect((await client.session())?.user.role).toBe("user");
  });

  it("uses the same failure code for missing accounts, wrong passwords and OAuth-only accounts", async () => {
    const user = state.users.get("user");
    if (!user) throw new Error("missing fixture");
    const missing = await client.login("missing@sift.local");
    const wrong = await client.login("user@sift.local", "wrong-password");
    user.passwordHash = null;
    const oauth = await client.login();
    for (const result of [missing, wrong, oauth]) {
      expect(result.headers.get("location")).toContain("code=credentials");
    }
    expect(state.sessions.size).toBe(0);
  });

  it("rejects bcrypt truncation and malformed inputs before querying users", async () => {
    await client.login("user@sift.local", "a".repeat(73));
    await client.login("user@sift.local", "ع".repeat(37));
    await client.login("x".repeat(255), "password");
    await client.login("user@sift.local", "");
    expect(state.userFind).not.toHaveBeenCalled();
    expect(state.sessions.size).toBe(0);
  });

  it("rejects credential POSTs without a CSRF token", async () => {
    await client.request("callback/credentials", {
      email: "user@sift.local",
      password: "sift-dev-password",
    });
    expect(state.sessions.size).toBe(0);
  });

  it("does not revoke a session on a cross-site sign-out POST without CSRF", async () => {
    await client.login();
    await client.request("signout", { callbackUrl: `${origin}/en/auth-spike` });
    expect(state.sessions.size).toBe(1);
  });

  it("detects a failed server revocation even though Auth.js swallows sign-out event errors", async () => {
    const attempt = createSpikeSignOutAttempt(state.db, () => true);
    const guarded = browser(attempt.config);
    await guarded.login();
    state.sessionDelete.mockRejectedValueOnce(new Error("database offline"));
    await guarded.logout();
    expect(() => attempt.assertRevoked()).toThrow("Server-side session revocation failed");
    expect(state.sessions.size).toBe(1);
  });

  it("does not redirect credentials to an external site", async () => {
    const csrfToken = (await (await client.request("csrf")).json()).csrfToken;
    const response = await client.request("callback/credentials", {
      email: "user@sift.local",
      password: "sift-dev-password",
      csrfToken,
      callbackUrl: "https://attacker.example/",
    });
    expect(new URL(response.headers.get("location") ?? "").origin).toBe(origin);
  });

  it("disables authentication when the local opt-in is removed", async () => {
    await client.login();
    const disabled = browser(
      createSpikeConfig(state.db, () => false),
      client.cookie(),
    );
    expect(await disabled.session()).toBeNull();
    await disabled.login();
    expect(state.sessions.size).toBe(1);
  });
});

describe("spike gate", () => {
  it.each([
    [{ NODE_ENV: "production", SIFT_AUTH_SPIKE: "1" }, false],
    [{ NODE_ENV: "test", SIFT_AUTH_SPIKE: "1" }, false],
    [{ NODE_ENV: "development", SIFT_AUTH_SPIKE: "0" }, false],
    [{ NODE_ENV: "development", SIFT_AUTH_SPIKE: "1" }, true],
    [{}, false],
  ] as const)("requires explicit development opt-in: %j", (env, expected) => {
    expect(spikeEnabled(env)).toBe(expected);
  });
});

// Optional real PostgreSQL check, never silently uses the app's DATABASE_URL.
it.skipIf(!process.env.SIFT_AUTH_SPIKE_TEST_DATABASE_URL)(
  "runs login/read/logout/replay against the existing Prisma schema in disposable PostgreSQL",
  async () => {
    const url = process.env.SIFT_AUTH_SPIKE_TEST_DATABASE_URL;
    if (!url) throw new Error("missing test URL");
    const parsed = new URL(url);
    if (
      !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
      !parsed.pathname.endsWith("_auth_spike_test")
    ) {
      throw new Error("Use a localhost disposable database named *_auth_spike_test");
    }
    const db = new PrismaClient({ datasourceUrl: url });
    const email = `sft41-${randomUUID()}@example.test`;
    let id: string | undefined;
    try {
      const user = await db.user.create({ data: { email, passwordHash } });
      id = user.id;
      const config = createSpikeConfig(db, () => true);
      const client = browser(config);
      await client.login(email);
      expect(await db.session.count({ where: { userId: id } })).toBe(1);
      const savedCookie = client.cookie();
      expect((await client.session())?.user.id).toBe(id);
      await client.logout();
      expect(await db.session.count({ where: { userId: id } })).toBe(0);
      expect(await browser(config, savedCookie).session()).toBeNull();
    } finally {
      if (id) await db.user.delete({ where: { id } });
      await db.$disconnect();
    }
  },
);
