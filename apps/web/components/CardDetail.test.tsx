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
      bank: {
        nameAr: "بنك الاختبار",
        nameEn: "Test bank",
        entryUrls: [{ url: "https://bank.example/" }],
      },
      source: { url: "https://bank.example/cards/test" },
      verifiedAt: null,
      minMonthlyIncome: null,
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

    it(`includes the official source and genuine verification date on the detail page in ${locale}`, () => {
      const html = renderToStaticMarkup(
        <CardDetail
          card={{ ...card, verifiedAt: new Date("2026-10-21T09:00:00Z") }}
          locale={locale}
        />,
      );
      expect(html).toContain('href="https://bank.example/cards/test"');
      expect(html).toContain(t("provenance.verified"));
      expect(html).toContain(t("financialDisclaimer.body"));
      expect(html.indexOf(t("financialDisclaimer.body"))).toBeLessThan(
        html.indexOf('<h2 id="fees-heading"'),
      );
      expect(html).toContain(locale === "ar" ? "21 أكتوبر 2026" : "October 21, 2026");
    });

    it(`shows the full disclaimer before the first fee figure in ${locale}`, () => {
      const html = renderToStaticMarkup(<CardDetail card={card} locale={locale} />);
      const fees =
        html.split('<section aria-labelledby="fees-heading">')[1]?.split("</section>")[0] ?? "";
      const title = t("financialDisclaimer.title");
      const body = t("financialDisclaimer.body");
      expect(fees).toContain(title);
      expect(fees).toContain(body);
      expect(fees).toContain(`lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"`);
      expect(fees.indexOf(title)).toBeLessThan(fees.indexOf('<h2 id="fees-heading"'));
      expect(fees.indexOf(body)).toBeLessThan(fees.indexOf("<dl"));
      expect(fees).toContain("</svg> 0</span>");
      expect(html.split(title)).toHaveLength(2);
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
      expect(html.match(new RegExp(t("catalogue.notPublished"), "g"))).toHaveLength(11);
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
