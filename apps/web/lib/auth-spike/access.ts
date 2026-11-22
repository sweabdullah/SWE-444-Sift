import type { Session } from "next-auth";

/** Call INSIDE each handler/action, after reading a validated server session. */
export function spikeAccessStatus(
  session: Session | null,
  required: "user" | "admin",
): 200 | 401 | 403 {
  if (!session?.user.id) return 401;
  if (required === "admin" && session.user.role !== "admin") return 403;
  return 200;
}
