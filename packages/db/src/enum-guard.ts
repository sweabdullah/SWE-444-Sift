/**
 * Compile-time guard: every enum in @sift/schema must equal Prisma's generated enum.
 * If someone changes one side only, `pnpm build` fails here (and test/enums.test.ts fails).
 */
import type { $Enums } from "@prisma/client";
import type * as S from "@sift/schema";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

export type EnumsMatchPrisma = [
  Assert<Equal<$Enums.Locale, S.Locale>>,
  Assert<Equal<$Enums.CardStatus, S.CardStatus>>,
  Assert<Equal<$Enums.RewardType, S.RewardType>>,
  Assert<Equal<$Enums.CardNetwork, S.CardNetwork>>,
  Assert<Equal<$Enums.SpendingCategory, S.SpendingCategory>>,
  Assert<Equal<$Enums.RateUnit, S.RateUnit>>,
  Assert<Equal<$Enums.CapPeriod, S.CapPeriod>>,
  Assert<Equal<$Enums.SourceType, S.SourceType>>,
  Assert<Equal<$Enums.UserRole, S.UserRole>>,
  Assert<Equal<$Enums.PendingRequestKind, S.PendingRequestKind>>,
  Assert<Equal<$Enums.PendingRequestStatus, S.PendingRequestStatus>>,
  Assert<Equal<$Enums.CrawlRunStatus, S.CrawlRunStatus>>,
  Assert<Equal<$Enums.CrawlTrigger, S.CrawlTrigger>>,
];
