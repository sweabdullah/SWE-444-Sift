import type { PublishedCardDetailRow } from "@sift/db";
import { Riyal } from "@/components/Riyal";
import { RewardRateValue } from "@/components/RewardRateValue";
import { formatNumber } from "@/lib/format";
import { getTranslator, type Locale } from "@/lib/i18n";
import { RATE_UNIT_ORDER, formatRate, summarizeRewardRate } from "@/lib/sort";

type Tier = PublishedCardDetailRow["rewardTiers"][number];

/** Published facts only: missing caps/conditions never mean unlimited/unconditional. */
export function RewardTiers({ tiers, locale }: { tiers: Tier[]; locale: Locale }) {
  const t = getTranslator(locale);
  const unpublished = t("catalogue.notPublished");
  return (
    <section aria-labelledby="reward-tiers-heading">
      <h2 id="reward-tiers-heading" className="text-h2">
        {t("rewardTiers.heading")}
      </h2>
      {tiers.length === 0 ? (
        <p className="mt-3">{unpublished}</p>
      ) : (
        <>
          <dl className="mt-3 flex flex-col gap-2">
            {RATE_UNIT_ORDER.map((unit) => {
              const summary = summarizeRewardRate(
                tiers
                  .filter((tier) => tier.rateUnit === unit)
                  .map((tier) => ({
                    spendingCategory: tier.spendingCategory,
                    rate: Number(tier.rate.toString()),
                    rateUnit: tier.rateUnit,
                    minSpend: tier.minSpend === null ? null : Number(tier.minSpend.toString()),
                  })),
              );
              return summary === null ? null : (
                <div key={unit}>
                  <dt className="text-label text-platinum-deep">{t(`rewardTiers.unit.${unit}`)}</dt>
                  <dd>
                    <RewardRateValue t={t} locale={locale} rate={summary} />
                  </dd>
                </div>
              );
            })}
          </dl>
          <ol className="mt-4 flex min-w-0 flex-col gap-4">
            {tiers.map((tier, index) => (
              <li key={tier.id} className="min-w-0 rounded-md border border-line bg-white p-5">
                <h3 className="font-semibold">{t("rewardTiers.tier", { number: index + 1 })}</h3>
                <dl className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-label text-platinum-deep">{t("rewardTiers.type")}</dt>
                    <dd>{t(`rewardTiers.reward.${tier.rewardType}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-label text-platinum-deep">
                      {t("rewardTiers.categoryLabel")}
                    </dt>
                    <dd>{t(`rewardTiers.category.${tier.spendingCategory}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-label text-platinum-deep">{t("rewardTiers.rate")}</dt>
                    <dd>
                      <bdi className="whitespace-nowrap">
                        {formatRate(t, locale, tier.rateUnit, Number(tier.rate.toString()))}
                      </bdi>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-label text-platinum-deep">{t("rewardTiers.cap")}</dt>
                    <dd>
                      {tier.cap === null ? (
                        unpublished
                      ) : tier.rewardType === "cashback" ? (
                        <Riyal value={Number(tier.cap.toString())} locale={locale} />
                      ) : (
                        <>
                          <bdi className="whitespace-nowrap">
                            {t(`rewardTiers.capUnit.${tier.rewardType}`, {
                              amount: formatNumber(Number(tier.cap.toString()), locale, {
                                maximumFractionDigits: 2,
                              }),
                            })}
                          </bdi>
                          <span className="block text-label">
                            {t("rewardTiers.sarValueUnavailable")}
                          </span>
                        </>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-label text-platinum-deep">
                      {t("rewardTiers.periodLabel")}
                    </dt>
                    <dd>
                      {tier.capPeriod === null
                        ? unpublished
                        : t(`rewardTiers.period.${tier.capPeriod}`)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-label text-platinum-deep">
                      {t("rewardTiers.minimumSpend")}
                    </dt>
                    <dd>
                      {tier.minSpend === null ? (
                        unpublished
                      ) : (
                        <Riyal value={Number(tier.minSpend.toString())} locale={locale} />
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-label text-platinum-deep">{t("rewardTiers.condition")}</dt>
                    <dd className="whitespace-pre-line wrap-break-word">
                      {tier.translations[0]?.condition.trim()
                        ? tier.translations[0].condition
                        : unpublished}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
