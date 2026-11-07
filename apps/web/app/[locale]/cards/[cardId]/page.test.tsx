import { beforeEach, describe, expect, it, vi } from "vitest";
import { findPublishedCardById } from "@sift/db";
import { renderToStaticMarkup } from "react-dom/server";
import LocaleLayout from "@/app/[locale]/layout";
import { getTranslator } from "@/lib/i18n";
import CardDetailLayout from "./layout";
import CardDetailPage from "./page";

vi.mock("@sift/db", () => ({ findPublishedCardById: vi.fn() }));
vi.mock("@/lib/fonts", () => ({ fontVariables: "" }));
vi.mock("@/components/LocaleSwitch", () => ({ LocaleSwitch: () => null }));
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

  it.each(["ar", "en"] as const)(
    "renders the notice before the detail figures and again in the shared footer in %s",
    async (locale) => {
      vi.mocked(findPublishedCardById).mockResolvedValue({
        id: "card",
        bank: {
          nameAr: "بنك الاختبار",
          nameEn: "Test bank",
          entryUrls: [{ url: "https://bank.example/" }],
        },
        source: { url: "https://bank.example/cards/test" },
        verifiedAt: new Date("2026-10-21T09:00:00Z"),
        fee: null,
        minMonthlyIncome: null,
        rewardTiers: [],
        translations: [
          {
            name: locale === "ar" ? "بطاقة الاختبار" : "Test card",
            feeWaiverCondition: null,
            benefitsDescription: null,
            rewardConditions: null,
            eligibility: null,
          },
        ],
      });
      const params = Promise.resolve({ locale, cardId: "card" });
      const page = await CardDetailPage({ params });
      const detailLayout = await CardDetailLayout({ params, children: page });
      const html = renderToStaticMarkup(await LocaleLayout({ params, children: detailLayout }));
      const fees =
        html.split('<section aria-labelledby="fees-heading">')[1]?.split("</section>")[0] ?? "";
      const footer = html.split("<footer")[1] ?? "";
      const t = getTranslator(locale);
      expect(html).toContain('href="https://bank.example/cards/test"');
      expect(html).toMatch(/datetime="2026-10-21T09:00:00.000Z"/i);
      for (const key of ["financialDisclaimer.title", "financialDisclaimer.body"] as const) {
        const copy = t(key);
        expect(fees).toContain(copy);
        expect(fees.indexOf(copy)).toBeLessThan(fees.indexOf("<dl"));
        expect(footer).toContain(copy);
        expect(html.split(copy)).toHaveLength(3);
      }
      expect(html).toContain(`lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"`);
      expect(findPublishedCardById).toHaveBeenCalledWith("card", locale);
    },
  );

  for (const name of [null, "", " ", "Published name"]) {
    it(`requires a name in the requested locale (${JSON.stringify(name)})`, async () => {
      const card = {
        id: "card",
        bank: { nameAr: "بنك", nameEn: "Bank", entryUrls: [{ url: "https://bank.example/" }] },
        source: { url: "https://bank.example/cards/test" },
        verifiedAt: null,
        fee: null,
        minMonthlyIncome: null,
        rewardTiers: [],
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
