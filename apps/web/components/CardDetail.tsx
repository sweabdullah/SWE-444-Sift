import type { PublishedCardDetailRow } from "@sift/db";
import { Riyal } from "@/components/Riyal";
import { CardProvenance } from "@/components/CardProvenance";
import { formatNumber } from "@/lib/format";
import { getTranslator, type Locale } from "@/lib/i18n";

/** Six numeric fees; the seventh is the translated fee-waiver condition. */
const FEE_FIELDS = [
  "annualFee",
  "issuanceFee",
  "supplementaryCardFee",
  "fxMarkupPct",
  "cashAdvanceFee",
  "latePaymentFee",
] as const;

export function CardDetail({ card, locale }: { card: PublishedCardDetailRow; locale: Locale }) {
  const t = getTranslator(locale);
  const translation = card.translations[0];
  // The route rejects cards without a name in this locale; never fall back to another language.
  if (!translation) return null;
  const unpublished = t("catalogue.notPublished");
  const prose = (value: string | null) => (value?.trim() ? value : unpublished);

  return (
    <article className="flex min-w-0 flex-col gap-8 text-start">
      <div>
        <h1 className="text-title wrap-break-word">{translation.name}</h1>
        <p className="mt-2 text-platinum-deep">
          {locale === "ar" ? card.bank.nameAr : card.bank.nameEn}
        </p>
      </div>
      <CardProvenance
        sourceUrl={card.source.url}
        registeredSiteUrls={card.bank.entryUrls.map((entry) => entry.url)}
        verifiedAt={card.verifiedAt}
        locale={locale}
      />
      <section aria-labelledby="fees-heading">
        <h2 id="fees-heading" className="text-h2">
          {t("cardDetail.fees")}
        </h2>
        <dl className="mt-4 divide-y divide-line rounded-md border border-line bg-white px-5">
          {FEE_FIELDS.map((field) => {
            const value = card.fee?.[field];
            return (
              <div key={field} className="grid gap-2 py-4 sm:grid-cols-2 sm:gap-6">
                <dt>{t(`cardDetail.fee.${field}`)}</dt>
                <dd className="min-w-0 wrap-break-word sm:text-end">
                  {value === null || value === undefined ? (
                    unpublished
                  ) : field === "fxMarkupPct" ? (
                    t("catalogue.rate.percent", {
                      rate: formatNumber(Number(value.toString()), locale, {
                        maximumFractionDigits: 3,
                      }),
                    })
                  ) : (
                    <Riyal value={Number(value.toString())} locale={locale} />
                  )}
                </dd>
              </div>
            );
          })}
          <div className="grid gap-2 py-4 sm:grid-cols-2 sm:gap-6">
            <dt>{t("cardDetail.fee.waiverCondition")}</dt>
            <dd className="min-w-0 whitespace-pre-line wrap-break-word">
              {prose(translation.feeWaiverCondition)}
            </dd>
          </div>
        </dl>
      </section>
      <section aria-labelledby="benefits-heading">
        <h2 id="benefits-heading" className="text-h2">
          {t("cardDetail.benefits")}
        </h2>
        <p className="mt-3 whitespace-pre-line wrap-break-word">
          {prose(translation.benefitsDescription)}
        </p>
      </section>
      <section aria-labelledby="rewards-heading">
        <h2 id="rewards-heading" className="text-h2">
          {t("cardDetail.rewardConditions")}
        </h2>
        <p className="mt-3 whitespace-pre-line wrap-break-word">
          {prose(translation.rewardConditions)}
        </p>
      </section>
      <section aria-labelledby="eligibility-heading">
        <h2 id="eligibility-heading" className="text-h2">
          {t("cardDetail.eligibility")}
        </h2>
        <p className="mt-3 whitespace-pre-line wrap-break-word">{prose(translation.eligibility)}</p>
        <dl className="mt-4">
          <dt className="text-label text-platinum-deep">{t("cardDetail.minimumIncome")}</dt>
          <dd className="mt-1">
            {card.minMonthlyIncome === null ? (
              unpublished
            ) : (
              <Riyal value={Number(card.minMonthlyIncome.toString())} locale={locale} />
            )}
          </dd>
        </dl>
      </section>
    </article>
  );
}
