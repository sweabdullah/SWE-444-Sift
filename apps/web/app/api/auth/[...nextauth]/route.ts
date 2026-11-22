import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { prisma } from "@sift/db";
import { handlers } from "@/lib/auth/server";
import { createSignOutAttempt } from "@/lib/auth/config";
export const runtime = "nodejs";
export const GET = handlers.GET;
export async function POST(request: NextRequest) {
  const attempt = createSignOutAttempt(prisma);
  const response = await NextAuth(attempt.config).handlers.POST(request);
  try {
    attempt.assertRevoked();
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return response;
}
