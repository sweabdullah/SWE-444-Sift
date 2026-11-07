import type { Locale } from "@sift/schema";
import type { Translator } from "@/lib/i18n";
import { formatRate, type RewardRateSummary } from "@/lib/sort";
import { fillTemplate } from "@/lib/template";

/**
 * "Up to 10% · Base 1%" for one card. Each rate is its own bidi-isolated, non-wrapping <bdi>:
 * - Isolation: in an Arabic line a bare "0.7%" at the end of the sentence can be reordered to
 *   read "%0.7". <bdi> picks each figure's own direction (LTR for "0.7%", RTL for
 *   "0.33 ميل / ريال") without disturbing the sentence around it. Never force dir="ltr" here: it
 *   would reverse the Arabic unit words.
 * - No wrapping: a narrow screen may break the line between the two rates, never inside one.
 */
export function RewardRateValue({
  t,
  locale,
  rate,
}: {
  t: Translator;
  locale: Locale;
  rate: RewardRateSummary;
}) {
  const figure = (value: number) => (
    <bdi className="whitespace-nowrap">{formatRate(t, locale, rate.unit, value)}</bdi>
  );
  if (rate.base === rate.max) return figure(rate.max);
  return (
    <>
      {fillTemplate(t("catalogue.rate.upToBase"), {
        max: figure(rate.max),
        base: rate.base === null ? t("catalogue.notPublished") : figure(rate.base),
      })}
    </>
  );
}
