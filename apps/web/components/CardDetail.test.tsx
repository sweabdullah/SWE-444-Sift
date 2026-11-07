import { renderToStaticMarkup } from "react-dom/server";
import { Prisma, type PublishedCardDetailRow } from "@sift/db";
import { describe, expect, it } from "vitest";
import { getTranslator } from "@/lib/i18n";
import { CardDetail } from "./CardDetail";
import { CardDetailFeedback, CardDetailFeedbackProvider } from "./CardDetailFeedback";

describe("card detail content", () => {
  for (const locale of ["ar", "en"] as const) {
    const t = getTranslator(locale);
    const card: PublishedCardDetailRow = {
      id: "card_test",
      bank: { nameAr: "بنك الاختبار", nameEn: "Test bank" },
      minMonthlyIncome: null,
      rewardTiers: [],
      fee: {
        annualFee: new Prisma.Decimal(0),
        issuanceFee: null,
        supplementaryCardFee: new Prisma.Decimal(100),
        fxMarkupPct: new Prisma.Decimal("2.755"),
        cashAdvanceFee: new Prisma.Decimal(75),
        latePaymentFee: null,
      },
      translations: [
        {
          name: locale === "ar" ? "بطاقة الاختبار" : "Test card",
          feeWaiverCondition:
            locale === "ar" ? "إعفاء عند إنفاق 5000 ريال" : "Waived with SAR 5000 spend",
          benefitsDescription: locale === "ar" ? "دخول صالات المطارات" : "Airport lounge access",
          rewardConditions: locale === "ar" ? "تطبق الشروط المنشورة" : "Published conditions apply",
          eligibility: null,
        },
      ],
    };
    const translation = card.translations[0];
    if (!translation) throw new Error("Test card requires a translation");

    it(`integrates structured rewards with the existing detail page in ${locale}`, () => {
      const condition = locale === "ar" ? "المشتريات المؤهلة" : "Eligible purchases";
      const html = renderToStaticMarkup(
        <CardDetail
          locale={locale}
          card={{
            ...card,
            rewardTiers: [
              {
                id: "tier",
                rewardType: "cashback",
                spendingCategory: "fuel",
                rateUnit: "percent",
                rate: new Prisma.Decimal(5),
                cap: new Prisma.Decimal(200),
                capPeriod: "monthly",
                minSpend: null,
                translations: [{ condition }],
              },
            ],
          }}
        />,
      );
      expect(html).toContain('id="reward-tiers-heading"');
      expect(html).toContain(condition);
      expect(html).toContain("</svg> 200</span>");
      expect(html).toContain('id="fees-heading"');
    });

    it(`shows seven fees, preserving zero, unknown and percentage precision in ${locale}`, () => {
      const html = renderToStaticMarkup(<CardDetail card={card} locale={locale} />);
      const fees =
        html.split('<section aria-labelledby="fees-heading">')[1]?.split("</section>")[0] ?? "";
      expect(fees.match(/<dt>/g)).toHaveLength(7);
      expect(fees).toContain(t("cardDetail.fee.waiverCondition"));
      expect(fees).toContain(card.translations[0]?.feeWaiverCondition);
      expect(fees).toContain("</svg> 0</span>");
      expect(fees.match(new RegExp(t("catalogue.notPublished"), "g"))).toHaveLength(2);
      expect(fees).toContain("2.755%");
      expect(html).not.toMatch(/[\u0660-\u0669]/);
    });

    it(`renders stored prose in ${locale} and reports unpublished eligibility without inference`, () => {
      const html = renderToStaticMarkup(<CardDetail card={card} locale={locale} />);
      expect(html).toContain(card.translations[0]?.name);
      expect(html).toContain(locale === "ar" ? card.bank.nameAr : card.bank.nameEn);
      expect(html).toContain(card.translations[0]?.benefitsDescription);
      expect(html).toContain(card.translations[0]?.rewardConditions);
      const eligibility = html.split('<section aria-labelledby="eligibility-heading">')[1] ?? "";
      expect(eligibility).toContain(t("catalogue.notPublished"));
      expect(eligibility).not.toContain("</svg> 0");
    });

    it(`handles missing fee rows and unpublished or blank prose in ${locale}`, () => {
      const unknown = {
        ...card,
        fee: null,
        translations: [
          {
            ...translation,
            feeWaiverCondition: null,
            benefitsDescription: null,
            rewardConditions: " ",
            eligibility: null,
          },
        ],
      };
      const html = renderToStaticMarkup(<CardDetail card={unknown} locale={locale} />);
      expect(html.match(new RegExp(t("catalogue.notPublished"), "g"))).toHaveLength(12);
      expect(html).not.toContain("data-riyal");
    });

    it(`renders published eligibility verbatim and escapes bank content in ${locale}`, () => {
      const published = {
        ...card,
        minMonthlyIncome: new Prisma.Decimal(5000),
        translations: [
          {
            ...translation,
            eligibility: "<script>alert(1)</script>\n21+",
          },
        ],
      };
      const html = renderToStaticMarkup(<CardDetail card={published} locale={locale} />);
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;\n21+");
      expect(html).not.toContain("<script>");
      expect(html).toContain("</svg> 5,000</span>");
    });

    it(`shows localized loading and recoverable errors without exposing database errors in ${locale}`, () => {
      const copy = {
        loading: t("cardDetail.loading"),
        error: t("cardDetail.error"),
        retry: t("cardDetail.retry"),
      };
      const loading = renderToStaticMarkup(
        <CardDetailFeedbackProvider copy={copy}>
          <CardDetailFeedback />
        </CardDetailFeedbackProvider>,
      );
      const error = renderToStaticMarkup(
        <CardDetailFeedbackProvider copy={copy}>
          <CardDetailFeedback retry={() => {}} />
        </CardDetailFeedbackProvider>,
      );
      expect(loading).toContain('role="status"');
      expect(loading).toContain(copy.loading);
      expect(error).toContain('role="alert"');
      expect(error).toContain(copy.error);
      expect(error).toContain(copy.retry);
      expect(error).toContain("<button");
    });
  }
});
