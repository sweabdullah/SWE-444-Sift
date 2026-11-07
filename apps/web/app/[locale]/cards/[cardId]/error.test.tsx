import { renderToStaticMarkup } from "react-dom/server";
import { ErrorBoundaryHandler } from "next/dist/client/components/error-boundary";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findPublishedCardById, type PublishedCardDetailRow } from "@sift/db";
import CardDetailError from "./error";
import CardDetailPage from "./page";

vi.mock("@sift/db", () => ({ findPublishedCardById: vi.fn() }));

describe("card detail server-render retry", () => {
  beforeEach(() => {
    vi.mocked(findPublishedCardById).mockReset();
  });

  for (const locale of ["ar", "en"] as const) {
    it(`refreshes the server render and recovers from a transient failure in ${locale}`, async () => {
      const card: PublishedCardDetailRow = {
        id: "card_test",
        bank: {
          nameAr: "بنك الاختبار",
          nameEn: "Test bank",
          entryUrls: [{ url: "https://bank.example/" }],
        },
        source: { url: "https://bank.example/cards/test" },
        verifiedAt: null,
        minMonthlyIncome: null,
        rewardTiers: [],
        fee: null,
        translations: [
          {
            name: locale === "ar" ? "بطاقة الاختبار" : "Test card",
            feeWaiverCondition: null,
            benefitsDescription: null,
            rewardConditions: null,
            eligibility: null,
          },
        ],
      };
      const failure = new Error("Temporary database outage");
      vi.mocked(findPublishedCardById).mockRejectedValueOnce(failure).mockResolvedValueOnce(card);
      const params = Promise.resolve({ locale, cardId: card.id });
      await expect(CardDetailPage({ params })).rejects.toBe(failure);

      // Use the pinned Next runtime's actual retry implementation, not a mock that assumes
      // retry refreshes. Simulate the router fetching a new server render on refresh.
      const refreshedRenders: ReturnType<typeof CardDetailPage>[] = [];
      const refresh = vi.fn(() => {
        refreshedRenders.push(CardDetailPage({ params }));
      });
      const boundary = new ErrorBoundaryHandler({
        pathname: `/${locale}/cards/${card.id}`,
        errorComponent: CardDetailError,
      });
      boundary.context = {
        refresh,
        back: vi.fn(),
        forward: vi.fn(),
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        bfcacheId: "card-detail-test",
      };
      // The class is intentionally unmounted in this node test; record React's boundary
      // reset without calling setState on an unmounted component.
      const clearError = vi.spyOn(boundary, "setState").mockImplementation(() => {});
      const frameworkProps = { error: failure, reset: boundary.reset, retry: boundary.retry };
      const feedback = CardDetailError(frameworkProps);

      // This is the callback CardDetailFeedback assigns to the Try again button.
      feedback.props.retry();

      expect(refresh).toHaveBeenCalledExactlyOnceWith();
      expect(clearError).toHaveBeenCalledWith({ error: null });
      expect(refreshedRenders).toHaveLength(1);
      const recovered = renderToStaticMarkup(await refreshedRenders[0]);
      expect(findPublishedCardById).toHaveBeenCalledTimes(2);
      expect(findPublishedCardById).toHaveBeenNthCalledWith(2, card.id, locale);
      expect(recovered).toContain(locale === "ar" ? "بطاقة الاختبار" : "Test card");
      expect(recovered).toContain('id="fees-heading"');
      expect(recovered).not.toContain('role="alert"');
    });
  }
});
