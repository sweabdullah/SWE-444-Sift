import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@sift/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { supportedPassword } from "./policy";
import { verifyPassword } from "./password";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const AUTH_MAX_AGE = 30 * 24 * 60 * 60;
export function sessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Secure-sift.session-token"
    : "sift.session-token";
}
export type AuthOptions = {
  enabled?: () => boolean;
  basePath?: string;
  cookieName?: string;
  signInPage?: string;
  maxAge?: number;
};

/** Credentials uses JWT transport; every read still requires a live database session. */
export function createAuthConfig(db: PrismaClient, options: AuthOptions = {}): NextAuthConfig {
  const enabled = options.enabled ?? (() => true);
  const maxAge = options.maxAge ?? AUTH_MAX_AGE;
  const adapter = PrismaAdapter(db);
  const { createSession } = adapter;
  if (!createSession) throw new Error("Authentication requires the Prisma session adapter");

  return {
    adapter,
    basePath: options.basePath ?? "/api/auth",
    // Credentials does not support Auth.js's native database session strategy.
    cookies: {
      sessionToken: {
        name: options.cookieName ?? sessionCookieName(),
        options: { httpOnly: true, sameSite: "lax", path: "/" },
      },
    },
    session: { strategy: "jwt", maxAge },
    pages: {
      signIn: options.signInPage ?? "/ar/login",
      error: options.signInPage ?? "/ar/login",
    },
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
            !supportedPassword(password)
          )
            return null;

          // Registration and sign-in share the same trimmed, lowercase email policy.
          const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
          const matches = await verifyPassword(password, user?.passwordHash ?? null);
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
            expires: new Date(Date.now() + maxAge * 1000),
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
export function createSignOutAttempt(db: PrismaClient, options: AuthOptions = {}) {
  const config = createAuthConfig(db, options);
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
