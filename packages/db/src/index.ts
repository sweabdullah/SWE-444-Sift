/**
 * @sift/db — database access shared by the web app and the ingestion worker.
 *
 * Exports one PrismaClient per process, every generated model type and enum, and the typed
 * data-access functions every lane codes against (grouped by consumer lane):
 * - catalogue.ts — public reads (Lane B, Lane D). Always `status = published` in the query.
 * - shortlist.ts — a user's saved cards (Lane C).
 * - admin.ts     — pending-request queue and change log (Lane C, Lane D, Lane E).
 * - ingest.ts    — crawl runs and pending-request writes (Lane E, Lane D).
 *
 * Shapes come from @sift/schema; changing a signature here is a contract change
 * (packages/schema/README.md). Schema notes: packages/db/SCHEMA.md.
 */
export { prisma } from "./client.js";
export * from "./catalogue.js";
export * from "./shortlist.js";
export * from "./admin.js";
export * from "./ingest.js";
export type { EnumsMatchPrisma } from "./enum-guard.js";

export * from "@prisma/client";
