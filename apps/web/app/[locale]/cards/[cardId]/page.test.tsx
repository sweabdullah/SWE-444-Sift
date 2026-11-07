import { beforeEach, describe, expect, it, vi } from "vitest";
import { findPublishedCardById } from "@sift/db";
import CardDetailPage from "./page";

vi.mock("@sift/db", () => ({ findPublishedCardById: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("card detail route", () => {
  beforeEach(() => {
    vi.mocked(findPublishedCardById).mockReset();
  });

  it("rejects invalid locales before querying", async () => {
    await expect(
      CardDetailPage({ params: Promise.resolve({ locale: "fr", cardId: "card" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findPublishedCardById).not.toHaveBeenCalled();
  });

  it("returns not-found for any unavailable card rather than rendering a private card", async () => {
    vi.mocked(findPublishedCardById).mockResolvedValue(null);
    await expect(
      CardDetailPage({ params: Promise.resolve({ locale: "ar", cardId: "unavailable" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findPublishedCardById).toHaveBeenCalledWith("unavailable", "ar");
  });

  it("does not mask a database outage as a not-found result", async () => {
    vi.mocked(findPublishedCardById).mockRejectedValue(new Error("offline"));
    await expect(
      CardDetailPage({ params: Promise.resolve({ locale: "en", cardId: "card" }) }),
    ).rejects.toThrow("offline");
  });

  for (const name of [null, "", " ", "Published name"]) {
    it(`requires a name in the requested locale (${JSON.stringify(name)})`, async () => {
      const card = {
        id: "card",
        bank: { nameAr: "بنك", nameEn: "Bank" },
        fee: null,
        minMonthlyIncome: null,
        translations:
          name === null
            ? []
            : [
                {
                  name,
                  feeWaiverCondition: null,
                  benefitsDescription: null,
                  rewardConditions: null,
                  eligibility: null,
                },
              ],
      };
      vi.mocked(findPublishedCardById).mockResolvedValue(card);
      const result = CardDetailPage({ params: Promise.resolve({ locale: "en", cardId: "card" }) });
      if (name?.trim()) expect((await result).props).toEqual({ card, locale: "en" });
      else await expect(result).rejects.toThrow("NEXT_NOT_FOUND");
    });
  }
});
