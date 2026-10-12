/**
 * @sift/ingest — the ingestion worker.
 *
 * Runs as its own long-lived service, separate from the web app, because a bank
 * crawl takes minutes and serverless request timeouts would kill it mid-run.
 * The worker writes to the database; it never serves a page.
 *
 * Placeholder entry point. The service and its scheduler arrive in Sprint 6 (T-10, SFT-52).
 */
import { LOCALES } from "@sift/schema";

export function describeWorker(): string {
  return `Sift ingestion worker (locales: ${LOCALES.join(", ")})`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`${describeWorker()} — not implemented yet.`);
}
