/**
 * Enums that mirror the Postgres / Prisma enums in packages/db/prisma/schema.prisma.
 *
 * Single source for TypeScript: each enum is a `const` array (for UI lists and loops)
 * plus a `z.enum` built from that array (for validation). @sift/db asserts at build time
 * and in a test that every array matches Prisma's generated enum, so a drift fails CI.
 * Adding a value = a Prisma migration + the array here, in the same small contract PR.
 */
import { z } from "zod";
import { LOCALES } from "./locale.js";

export const CARD_STATUSES = ["draft", "published", "archived"] as const;
export const REWARD_TYPES = ["cashback", "points", "miles", "none"] as const;
export const CARD_NETWORKS = ["visa", "mastercard", "amex", "mada", "unionpay"] as const;
export const SPENDING_CATEGORIES = [
  "general",
  "dining",
  "groceries",
  "fuel",
  "travel",
  "airlines",
  "hotels",
  "online",
  "international",
  "entertainment",
  "shopping",
  "utilities",
  "education",
  "healthcare",
  "other",
] as const;
export const RATE_UNITS = ["percent", "points_per_sar", "miles_per_sar"] as const;
export const CAP_PERIODS = ["per_transaction", "monthly", "quarterly", "yearly"] as const;
export const SOURCE_TYPES = ["html", "pdf"] as const;
export const USER_ROLES = ["user", "admin"] as const;
export const PENDING_REQUEST_KINDS = ["new_card", "field_change", "withdrawal"] as const;
export const PENDING_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "failed_validation",
] as const;
export const CRAWL_RUN_STATUSES = ["running", "succeeded", "failed", "aborted_guard"] as const;
export const CRAWL_TRIGGERS = ["manual", "scheduled"] as const;

export const LocaleSchema = z.enum(LOCALES);
export const CardStatusSchema = z.enum(CARD_STATUSES);
export const RewardTypeSchema = z.enum(REWARD_TYPES);
export const CardNetworkSchema = z.enum(CARD_NETWORKS);
export const SpendingCategorySchema = z.enum(SPENDING_CATEGORIES);
export const RateUnitSchema = z.enum(RATE_UNITS);
export const CapPeriodSchema = z.enum(CAP_PERIODS);
export const SourceTypeSchema = z.enum(SOURCE_TYPES);
export const UserRoleSchema = z.enum(USER_ROLES);
export const PendingRequestKindSchema = z.enum(PENDING_REQUEST_KINDS);
export const PendingRequestStatusSchema = z.enum(PENDING_REQUEST_STATUSES);
export const CrawlRunStatusSchema = z.enum(CRAWL_RUN_STATUSES);
export const CrawlTriggerSchema = z.enum(CRAWL_TRIGGERS);

export type CardStatus = z.infer<typeof CardStatusSchema>;
export type RewardType = z.infer<typeof RewardTypeSchema>;
export type CardNetwork = z.infer<typeof CardNetworkSchema>;
export type SpendingCategory = z.infer<typeof SpendingCategorySchema>;
export type RateUnit = z.infer<typeof RateUnitSchema>;
export type CapPeriod = z.infer<typeof CapPeriodSchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type PendingRequestKind = z.infer<typeof PendingRequestKindSchema>;
export type PendingRequestStatus = z.infer<typeof PendingRequestStatusSchema>;
export type CrawlRunStatus = z.infer<typeof CrawlRunStatusSchema>;
export type CrawlTrigger = z.infer<typeof CrawlTriggerSchema>;
