/**
 * @sift/db — database access shared by the web app and the ingestion worker.
 *
 * Exports one PrismaClient per process plus every generated model type and enum.
 * Schema notes: packages/db/SCHEMA.md. Seed script: T-7 (SFT-11).
 */
import { PrismaClient } from "@prisma/client";

// Re-use one client across hot reloads in development (Next.js re-evaluates modules),
// otherwise every reload opens a new connection pool.
const globalForPrisma = globalThis as unknown as { siftPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.siftPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.siftPrisma = prisma;
}

export * from "@prisma/client";
