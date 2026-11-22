import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { prisma } from "@sift/db";
import { handlers } from "@/lib/auth-spike/server";
import { createSpikeSignOutAttempt, spikeEnabled } from "@/lib/auth-spike/config";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  if (!spikeEnabled()) return new Response(null, { status: 404 });
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!spikeEnabled()) return new Response(null, { status: 404 });
  const attempt = createSpikeSignOutAttempt(prisma);
  const response = await NextAuth(attempt.config).handlers.POST(request);
  try {
    attempt.assertRevoked();
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return response;
}
