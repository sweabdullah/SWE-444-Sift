import { withRole } from "@/lib/auth/guards";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A read-only permission probe, not SFT-44's separate administrator sign-in/dashboard.
export const GET = withRole("admin", () => Response.json({ role: "admin" }));
