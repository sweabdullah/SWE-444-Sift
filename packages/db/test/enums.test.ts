// Pure test (no database): @sift/schema's enum arrays must equal Prisma's generated enums.
import { $Enums } from "@prisma/client";
import * as S from "@sift/schema";
import { describe, expect, it } from "vitest";

const pairs: [string, Record<string, string>, readonly string[]][] = [
  ["Locale", $Enums.Locale, S.LOCALES],
  ["CardStatus", $Enums.CardStatus, S.CARD_STATUSES],
  ["RewardType", $Enums.RewardType, S.REWARD_TYPES],
  ["CardNetwork", $Enums.CardNetwork, S.CARD_NETWORKS],
  ["SpendingCategory", $Enums.SpendingCategory, S.SPENDING_CATEGORIES],
  ["RateUnit", $Enums.RateUnit, S.RATE_UNITS],
  ["CapPeriod", $Enums.CapPeriod, S.CAP_PERIODS],
  ["SourceType", $Enums.SourceType, S.SOURCE_TYPES],
  ["UserRole", $Enums.UserRole, S.USER_ROLES],
  ["PendingRequestKind", $Enums.PendingRequestKind, S.PENDING_REQUEST_KINDS],
  ["PendingRequestStatus", $Enums.PendingRequestStatus, S.PENDING_REQUEST_STATUSES],
  ["CrawlRunStatus", $Enums.CrawlRunStatus, S.CRAWL_RUN_STATUSES],
  ["CrawlTrigger", $Enums.CrawlTrigger, S.CRAWL_TRIGGERS],
];

describe("@sift/schema enums mirror Prisma", () => {
  it.each(pairs)("%s matches", (_name, prismaEnum, schemaArray) => {
    expect([...schemaArray].sort()).toEqual(Object.values(prismaEnum).sort());
  });

  it("covers every Prisma enum", () => {
    expect(pairs.map(([name]) => name).sort()).toEqual(Object.keys($Enums).sort());
  });
});
