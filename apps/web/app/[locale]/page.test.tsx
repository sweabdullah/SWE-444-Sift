import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { findPublishedCardsForList } from "@sift/db";
import HomePage from "./page";

vi.mock("@sift/db", () => ({ findPublishedCardsForList: vi.fn(), countPublishedCards: vi.fn() }));
vi.mock("@/components/LocaleSwitch", () => ({ LocaleSwitch: () => null }));

describe("catalogue to detail navigation", () => {
  for (const locale of ["ar", "en"] as const) {
    it(`links each card name to its stable detail URL in ${locale}`, async () => {
      vi.mocked(findPublishedCardsForList).mockResolvedValue([
        {
          id: "card_test",
          bank: { nameAr: "بنك", nameEn: "Bank" },
          fee: null,
          translations: [{ name: locale === "ar" ? "بطاقة" : "Card" }],
          rewardTiers: [],
        },
      ]);
      const html = renderToStaticMarkup(
        await HomePage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) }),
      );
      expect(html).toContain(`href="/${locale}/cards/card_test"`);
      expect(html).toContain(locale === "ar" ? "بطاقة</a>" : "Card</a>");
    });
  }
});
