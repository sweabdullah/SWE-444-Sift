import "server-only";
import { headers } from "next/headers";
import { revokeCookieSession } from "./revoke";
import NextAuth from "next-auth";
import { prisma } from "@sift/db";
import { createAuthConfig } from "./config";
export const { handlers, auth, signIn } = NextAuth(createAuthConfig(prisma));

/** Revoke before clearing the cookie so a failed DB write leaves a retryable credential. */
export async function revokeAndSignOut() {
  await revokeCookieSession(prisma, new Headers(await headers()), process.env.AUTH_SECRET);
  await NextAuth(createAuthConfig(prisma)).signOut({ redirect: false });
}
