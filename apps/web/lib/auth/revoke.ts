import type { PrismaClient } from "@sift/db";
import { getToken } from "next-auth/jwt";
import { sessionCookieName } from "./config";
/** Decode only to revoke THIS cookie's row. This is never an authorization shortcut. */
export async function revokeCookieSession(
  db: PrismaClient,
  headers: Headers,
  secret: string | undefined,
) {
  if (!secret) throw new Error("Missing authentication secret");
  const token = await getToken({
    req: { headers: new Headers({ cookie: headers.get("cookie") ?? "" }) },
    secret,
    cookieName: sessionCookieName(),
  });
  if (typeof token?.sid !== "string" || typeof token.sub !== "string") return;
  await db.session.deleteMany({ where: { sessionToken: token.sid, userId: token.sub } });
}
