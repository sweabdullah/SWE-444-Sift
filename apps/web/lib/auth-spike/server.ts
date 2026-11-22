import "server-only";
import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@sift/db";
import { createSpikeConfig, createSpikeSignOutAttempt, spikeEnabled } from "./config";

// Keep this module on the server. Demo routes/actions are the only consumers.
export const { handlers, auth, signIn } = NextAuth(createSpikeConfig(prisma));

export async function confirmedSignOut(destination: string) {
  if (!spikeEnabled()) throw new Error("Authentication spike is disabled");
  const attempt = createSpikeSignOutAttempt(prisma);
  await NextAuth(attempt.config).signOut({ redirect: false });
  attempt.assertRevoked();
  redirect(destination);
}
