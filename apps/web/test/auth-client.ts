import { vi } from "vitest";
import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import { NextRequest } from "next/server";
const secret = "sft-auth-test-only-secret-not-for-deployment-0123456789";
const origin = "http://localhost:3000";
export function authClient(config: NextAuthConfig, initialCookie = "") {
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
    const req = new NextRequest(`${origin}/api/auth/${action}`, {
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
