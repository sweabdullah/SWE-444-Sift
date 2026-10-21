/**
 * Writes from the ingestion worker (Lane E crawler, Lane D extractor). Nothing here makes
 * a card public: discoveries become pending requests that an admin reviews (S-46).
 */
import { Prisma } from "@prisma/client";
import {
  ExtractedCardSchema,
  WithdrawalPayloadSchema,
  type CrawlRun,
  type CrawlRunStatus,
  type CrawlTrigger,
  type PendingRequest,
  type PendingRequestKind,
  type ValidationIssue,
} from "@sift/schema";
import type { z } from "zod";
import { prisma } from "./client.js";
import { toValidationIssues } from "./mappers.js";

/**
 * Open a crawl run (status `running`). Call finishCrawlRun when it ends.
 *
 * Owner: Lane E (S-29 crawl run records, S-40 crawler).
 */
export async function recordCrawlRun(input: {
  bankId: string;
  trigger: CrawlTrigger;
}): Promise<CrawlRun> {
  return prisma.crawlRun.create({ data: { bankId: input.bankId, trigger: input.trigger } });
}

/**
 * Close a crawl run: final status, counters and error; stamps finishedAt.
 * `aborted_guard` = the collapse guard stopped it (S-51); such runs must not touch absences.
 *
 * Owner: Lane E (S-29, S-51).
 */
export async function finishCrawlRun(
  id: string,
  result: {
    status: Exclude<CrawlRunStatus, "running">;
    pagesFetched: number;
    cardsFound: number;
    error?: string | null;
  },
): Promise<CrawlRun> {
  return prisma.crawlRun.update({
    where: { id },
    data: {
      status: result.status,
      pagesFetched: result.pagesFetched,
      cardsFound: result.cardsFound,
      error: result.error ?? null,
      finishedAt: new Date(),
    },
  });
}

export interface CreatePendingRequestInput {
  kind: PendingRequestKind;
  bankId: string;
  sourceId: string;
  cardId?: string | null;
  crawlRunId?: string | null;
  /**
   * The draft exactly as the extractor returned it: an ExtractedCard for new_card /
   * field_change, a WithdrawalPayload for withdrawal. Typed `unknown` on purpose: it is
   * validated here, and kept verbatim even when invalid so the failure can be diagnosed.
   */
  payload: unknown;
}

function toIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((i) => ({
    path: i.path.map(String).join("."),
    code: i.code,
    message: i.message,
  }));
}

/**
 * Store a discovered card / change / withdrawal as a pending request. The payload is
 * validated against the shared contract: valid → status `pending`; invalid → status
 * `failed_validation` with the issues in validationErrors and the raw payload retained
 * (S-45). It never becomes a normal draft and never appears in a public query.
 *
 * Owner: Lane D (S-44 / S-45 / S-46). Also called by Lane E (S-36 withdrawal).
 */
export async function createPendingRequest(
  input: CreatePendingRequestInput,
): Promise<PendingRequest> {
  const schema = input.kind === "withdrawal" ? WithdrawalPayloadSchema : ExtractedCardSchema;
  const result = schema.safeParse(input.payload);
  const payload =
    input.payload === undefined || input.payload === null
      ? Prisma.JsonNull
      : (input.payload as Prisma.InputJsonValue);
  const row = await prisma.pendingRequest.create({
    data: {
      kind: input.kind,
      status: result.success ? "pending" : "failed_validation",
      bankId: input.bankId,
      sourceId: input.sourceId,
      cardId: input.cardId ?? null,
      crawlRunId: input.crawlRunId ?? null,
      payload,
      validationErrors: result.success ? Prisma.DbNull : toIssues(result.error),
    },
  });
  return { ...row, validationErrors: toValidationIssues(row.validationErrors) };
}
