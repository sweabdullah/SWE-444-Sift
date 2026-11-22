import { auth } from "@/lib/auth-spike/server";
import { spikeEnabled } from "@/lib/auth-spike/config";
import { spikeAccessStatus } from "@/lib/auth-spike/access";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ role: string }> }) {
  if (!spikeEnabled()) return new Response(null, { status: 404 });
  const { role } = await context.params;
  if (role !== "user" && role !== "admin") return new Response(null, { status: 404 });
  // Check here, even if navigation or an upstream proxy already checked.
  const status = spikeAccessStatus(await auth(), role);
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}
