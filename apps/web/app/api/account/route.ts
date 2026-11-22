import { withRole } from "@/lib/auth/guards";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Query/body/header user IDs and roles never choose whose account this endpoint returns.
export const GET = withRole("user", (_request, identity) => Response.json(identity));
