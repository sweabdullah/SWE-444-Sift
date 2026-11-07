import { beforeEach, describe, expect, it, vi } from "vitest";
import { findPublishedCardById } from "../../../packages/db/src/catalogue";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("../../../packages/db/src/client.js", () => ({ prisma: { card: { findFirst } } }));

describe("public detail database query", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  for (const locale of ["ar", "en"] as const) {
    it(`restricts direct URL lookups to published cards and ${locale} prose`, async () => {
      findFirst.mockResolvedValue(null);
      expect(await findPublishedCardById("private-card", locale)).toBeNull();
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: "private-card", status: "published" },
        select: expect.objectContaining({
          fee: {
            select: {
              annualFee: true,
              issuanceFee: true,
              supplementaryCardFee: true,
              fxMarkupPct: true,
              cashAdvanceFee: true,
              latePaymentFee: true,
            },
          },
          translations: {
            where: { locale },
            select: {
              name: true,
              feeWaiverCondition: true,
              benefitsDescription: true,
              rewardConditions: true,
              eligibility: true,
            },
          },
        }),
      });
    });
  }

  it("propagates database failures so the error boundary can offer a retry", async () => {
    findFirst.mockRejectedValue(new Error("database unavailable"));
    await expect(findPublishedCardById("card", "ar")).rejects.toThrow("database unavailable");
  });
});
