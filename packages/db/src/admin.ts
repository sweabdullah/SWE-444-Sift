/**
 * Admin reads: the pending-request queue and the change log (Lane C review UI, Lane D
 * queue, Lane E change diff). Callers must check the admin role server-side first (S-39).
 */
import type { Prisma } from "@prisma/client";
import {
  ExtractedCardSchema,
  WithdrawalPayloadSchema,
  type BankRef,
  type CardChange,
  type ExtractedCard,
  type PendingRequest,
  type PendingRequestKind,
  type PendingRequestStatus,
  type WithdrawalPayload,
} from "@sift/schema";
import { prisma } from "./client.js";
import { toValidationIssues } from "./mappers.js";

const pendingInclude = {
  bank: { select: { id: true, slug: true, nameAr: true, nameEn: true } },
  source: { select: { url: true, fetchedAt: true } },
  crawlRun: { select: { id: true, startedAt: true } },
} satisfies Prisma.PendingRequestInclude;

type PendingRow = Prisma.PendingRequestGetPayload<{ include: typeof pendingInclude }>;

/** A queue row with what S-46 says must be visible: source URL, timestamp, crawl run. */
export interface PendingRequestListItem extends PendingRequest {
  bank: BankRef;
  source: { url: string; fetchedAt: Date };
  crawlRun: { id: string; startedAt: Date } | null;
}

/** A single request with its payload parsed against the contract (null when it does not fit). */
export interface PendingRequestDetail extends PendingRequestListItem {
  /** Set for new_card / field_change when the payload is a valid ExtractedCard. */
  extracted: ExtractedCard | null;
  /** Set for withdrawal when the payload is a valid WithdrawalPayload. */
  withdrawal: WithdrawalPayload | null;
}

function toListItem(row: PendingRow): PendingRequestListItem {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    bankId: row.bankId,
    cardId: row.cardId,
    crawlRunId: row.crawlRunId,
    sourceId: row.sourceId,
    payload: row.payload,
    validationErrors: toValidationIssues(row.validationErrors),
    createdAt: row.createdAt,
    reviewedById: row.reviewedById,
    reviewedAt: row.reviewedAt,
    reviewNote: row.reviewNote,
    bank: row.bank,
    source: row.source,
    crawlRun: row.crawlRun,
  };
}

/**
 * The pending-request queue, oldest first (sorted by age, S-46). Filter by status, kind
 * and/or bank. With no status it returns every status.
 *
 * Owner: Lane D (S-46 queue). Consumed by Lane C (S-30 review UI).
 */
export async function listPendingRequests(
  options: { status?: PendingRequestStatus; kind?: PendingRequestKind; bankId?: string } = {},
): Promise<PendingRequestListItem[]> {
  const rows = await prisma.pendingRequest.findMany({
    where: { status: options.status, kind: options.kind, bankId: options.bankId },
    include: pendingInclude,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map(toListItem);
}

/**
 * One pending request with its payload parsed (`extracted` / `withdrawal`). null if absent.
 *
 * Owner: Lane C (S-30 field-by-field review, S-36 withdrawal approval).
 */
export async function getPendingRequest(id: string): Promise<PendingRequestDetail | null> {
  const row = await prisma.pendingRequest.findUnique({ where: { id }, include: pendingInclude });
  if (!row) return null;
  const item = toListItem(row);
  const extracted =
    row.kind === "withdrawal" ? null : (ExtractedCardSchema.safeParse(row.payload).data ?? null);
  const withdrawal =
    row.kind === "withdrawal"
      ? (WithdrawalPayloadSchema.safeParse(row.payload).data ?? null)
      : null;
  return { ...item, extracted, withdrawal };
}

/**
 * Field-level changes, oldest approval first. `since` = approved at or after; `notified`
 * false = not yet sent in a digest (S-54), true = already sent.
 *
 * Owner: Lane E (S-35 change diff). Consumed by Lane B (S-54 digest, if kept).
 */
export async function listCardChanges(
  options: { since?: Date; notified?: boolean; cardId?: string } = {},
): Promise<CardChange[]> {
  const notifiedAt =
    options.notified === undefined ? undefined : options.notified ? { not: null } : null;
  const rows = await prisma.cardChange.findMany({
    where: {
      cardId: options.cardId,
      approvedAt: options.since ? { gte: options.since } : undefined,
      notifiedAt,
    },
    orderBy: [{ approvedAt: "asc" }, { id: "asc" }],
  });
  return rows;
}
