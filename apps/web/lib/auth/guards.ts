import "server-only";
import { auth } from "./server";
export type Identity = { id: string; email: string | null; role: "user" | "admin" };
export type ProtectedRole = "user" | "admin";
export class AccessDenied extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  }
}
/** Re-read a validated server session in EACH handler/action; never accept a client identity. */
export async function requireRole(required: ProtectedRole): Promise<Identity> {
  const session = await auth();
  if (!session?.user?.id || !["user", "admin"].includes(session.user.role))
    throw new AccessDenied(required === "admin" ? 403 : 401);
  if (required === "admin" && session.user.role !== "admin") throw new AccessDenied(403);
  return { id: session.user.id, email: session.user.email ?? null, role: session.user.role };
}
export function requireUser() {
  return requireRole("user");
}
export function requireAdmin() {
  return requireRole("admin");
}
export function withRole(
  required: ProtectedRole,
  handler: (request: Request, identity: Identity) => Promise<Response> | Response,
) {
  return async (request: Request) => {
    try {
      const identity = await requireRole(required);
      const response = await handler(request, identity);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      if (!(error instanceof AccessDenied)) throw error;
      return Response.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}
