import { PrismaClient } from "@prisma/client";

// Re-use one client across hot reloads in development (Next.js re-evaluates modules),
// otherwise every reload opens a new connection pool.
const globalForPrisma = globalThis as unknown as { siftPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.siftPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.siftPrisma = prisma;
}
