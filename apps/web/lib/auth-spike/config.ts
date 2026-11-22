import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@sift/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare, hash } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const SPIKE_MAX_AGE = 60 * 60 * 24;
export const SPIKE_COOKIE = "sift.auth-spike.session-token";
export const SPIKE_BASE_PATH = "/api/auth-spike";
const BCRYPT_COST = 12;
// Compare missing accounts against a real hash too. Only a timing equalizer, never an account.
const dummyHash = hash("sft-41-missing-account-placeholder", BCRYPT_COST);

export function spikeEnabled(
  env: { NODE_ENV?: string; SIFT_AUTH_SPIKE?: string } = process.env,
): boolean {
  return env.NODE_ENV === "development" && env.SIFT_AUTH_SPIKE === "1";
}

/** Learning spike only: JWT transport plus a mandatory, revocable database session. */
export function createSpikeConfig(
  db: PrismaClient,
  enabled: () => boolean = spikeEnabled,
): NextAuthConfig {
  const adapter = PrismaAdapter(db);
  const { createSession } = adapter;
  if (!createSession) throw new Error("The spike needs the Prisma session adapter");

  return {
    adapter,
    basePath: SPIKE_BASE_PATH,
    // Credentials does not support Auth.js's native database session strategy.
    cookies: {
      sessionToken: { name: SPIKE_COOKIE, options: { httpOnly: true, sameSite: "lax", path: "/" } },
    },
    session: { strategy: "jwt", maxAge: SPIKE_MAX_AGE },
    pages: { signIn: "/en/auth-spike", error: "/en/auth-spike" },
    providers: [
      Credentials({
        credentials: { email: {}, password: {} },
        async authorize(credentials) {
          if (!enabled()) return null;
          const { email, password } = credentials;
          if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            email.length > 254 ||
            password.length === 0 ||
            Buffer.byteLength(password, "utf8") > 72
          )
            return null;

          // Existing seed emails are lowercase. SFT-38 must own the registration policy.
          const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
          const matches = await compare(password, user?.passwordHash ?? (await dummyHash));
          if (!matches || !user?.passwordHash) return null;
          // Never return the database user wholesale: it contains passwordHash and private fields.
          return { id: user.id, email: user.email, name: user.name, image: user.image };
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (!enabled()) return null;
        if (user) {
          if (!user.id) return null;
          const sid = randomBytes(32).toString("base64url");
          await createSession({
            sessionToken: sid,
            userId: user.id,
            expires: new Date(Date.now() + SPIKE_MAX_AGE * 1000),
          });
          token.sid = sid;
          token.sub = user.id;
        }
        if (typeof token.sid !== "string" || typeof token.sub !== "string") return null;
        const row = await db.session.findUnique({
          where: { sessionToken: token.sid },
          include: { user: true },
        });
        // A signed JWT alone is never authority. Also reload the current role on EVERY read.
        if (!row || row.userId !== token.sub || row.expires.getTime() <= Date.now()) return null;
        token.role = row.user.role;
        token.email = row.user.email;
        token.name = row.user.name;
        token.picture = row.user.image;
        token.sessionExpires = row.expires.toISOString();
        return token;
      },
      session({ session, token }) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role === "admin" ? "admin" : "user";

        // sid stays in the encrypted HttpOnly cookie, never in the browser-readable session JSON.
        return {
          ...session,
          expires:
            typeof token.sessionExpires === "string" ? token.sessionExpires : session.expires,
        };
      },
    },
    events: {
      async signOut(message) {
        if ("token" in message && typeof message.token?.sid === "string") {
          // Idempotent revocation. JWT sign-out does not call adapter.deleteSession by itself.
          await db.session.deleteMany({ where: { sessionToken: message.token.sid } });
        }
      },
    },
  };
}

/** Auth.js logs event failures and still clears cookies. Callers must not report success. */
export function createSpikeSignOutAttempt(db: PrismaClient, enabled = spikeEnabled) {
  const config = createSpikeConfig(db, enabled);
  const signOut = config.events?.signOut;
  let failure: unknown;
  config.events = {
    ...config.events,
    async signOut(message) {
      try {
        await signOut?.(message);
      } catch (error) {
        failure = error;
        throw error;
      }
    },
  };
  return {
    config,
    assertRevoked() {
      if (failure) throw new Error("Server-side session revocation failed", { cause: failure });
    },
  };
}
