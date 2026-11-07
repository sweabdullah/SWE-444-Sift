import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { countPublishedCards, findPublishedCardsForList } from "@sift/db";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { CatalogueFiltersForm } from "@/components/CatalogueFilters";
import { Riyal } from "@/components/Riyal";
import { CardProvenance } from "@/components/CardProvenance";
import { toCardList } from "@/lib/catalogue";
import {
  buildCardWhere,
  buildUnknownFeeWhere,
  buildUnknownIncomeWhere,
  buildUnknownShariaWhere,
  hasActiveFilters,
  parseFilters,
  type SearchParams,
} from "@/lib/filters";
import { getTranslator, isLocale } from "@/lib/i18n";
import { clearFiltersHref, formatRate, parseSort } from "@/lib/sort";

// Read the published cards from the database on every request, so a change an administrator
// publishes shows up without a rebuild (and builds never need a database).
export const dynamic = "force-dynamic";

/**
 * Home page: the published cards, read from the database and narrowed by the filters in the
 * query string (SFT-28 reward type, SFT-29 annual fee, SFT-30 minimum income, SFT-31 Sharia-compliant)
 * and ordered by the visitor's sort (SFT-33 annual fee or reward rate). The full catalogue is SFT-18.
 */
export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const query = await searchParams;
  const filters = parseFilters(query);
  const sort = parseSort(query);
  const filtered = hasActiveFilters(filters);
  const unknownFeeWhere = buildUnknownFeeWhere(filters);
  const unknownIncomeWhere = buildUnknownIncomeWhere(filters);
  const unknownShariaWhere = buildUnknownShariaWhere(filters);
  const [rows, unknownFeeCount, unknownIncomeCount, unknownShariaCount] = await Promise.all([
    findPublishedCardsForList(locale, buildCardWhere(filters)),
    unknownFeeWhere ? countPublishedCards(unknownFeeWhere) : 0,
    unknownIncomeWhere ? countPublishedCards(unknownIncomeWhere) : 0,
    unknownShariaWhere ? countPublishedCards(unknownShariaWhere) : 0,
  ]);
  const cards = toCardList(rows, locale, sort);

  return (
    <div className="mx-auto flex min-h-dvh max-w-page flex-col px-6">
      <header className="flex items-center justify-between gap-4 py-6">
        <Image
          src={`/sift-lockup-${locale}-on-light.svg`}
          alt={t("common.logoAlt")}
          width={160}
          height={48}
          className="h-10 w-auto"
          unoptimized
          priority
        />
        <LocaleSwitch
          locale={locale}
          label={t("localeSwitch.label")}
          ariaLabel={t("localeSwitch.ariaLabel")}
        />
      </header>
      <main className="flex flex-1 flex-col gap-10 pt-10 pb-16">
        <div>
          {/* Marketing headline (32px): the only place the display serif is used. */}
          <h1 className="font-display text-h1 text-start">{t("home.title")}</h1>
          <p className="mt-3 max-w-xl text-start text-platinum-deep">{t("home.tagline")}</p>
        </div>

        <section aria-labelledby="catalogue-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 id="catalogue-heading" className="text-h2 text-start">
              {t("catalogue.heading")}
            </h2>
            <p className="text-label text-platinum-deep" aria-live="polite">
              {filtered
                ? t("catalogue.filters.matchCount", { count: cards.length })
                : t("catalogue.count", { count: cards.length })}
            </p>
          </div>
          <p className="text-label text-start text-platinum-deep">
            {t(`catalogue.sortNote.${sort}`)}
          </p>

          <CatalogueFiltersForm locale={locale} filters={filters} sort={sort} />

          {unknownFeeCount > 0 && (
            <p className="text-label text-start text-platinum-deep">
              {t("catalogue.filters.unknownFee", { count: unknownFeeCount })}
            </p>
          )}
          {unknownIncomeCount > 0 && (
            <p className="text-label text-start text-platinum-deep">
              {t("catalogue.filters.unknownIncome", { count: unknownIncomeCount })}
            </p>
          )}
          {unknownShariaCount > 0 && (
            <p className="text-label text-start text-platinum-deep">
              {t("catalogue.filters.unknownSharia", { count: unknownShariaCount })}
            </p>
          )}

          {cards.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-line bg-white p-6">
              <p className="text-start">
                {filtered ? t("catalogue.filters.noMatch") : t("catalogue.empty")}
              </p>
              {filtered && (
                <Link
                  href={clearFiltersHref(locale, sort)}
                  className="text-start underline underline-offset-4"
                >
                  {t("catalogue.filters.clear")}
                </Link>
              )}
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <li
                  key={card.id}
                  className="flex flex-col gap-4 rounded-md border border-line bg-white p-5"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-start font-semibold">
                      <Link
                        href={`/${locale}/cards/${encodeURIComponent(card.id)}`}
                        className="underline underline-offset-4"
                      >
                        {card.name}
                      </Link>
                    </h3>
                    <p className="text-label text-start text-platinum-deep">{card.bankName}</p>
                  </div>
                  <dl className="mt-auto flex flex-col gap-2 border-t border-line pt-3">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-label text-platinum-deep">{t("catalogue.annualFee")}</dt>
                      <dd className="font-semibold">
                        {card.annualFee === null ? (
                          <span className="text-label font-normal text-platinum-deep">
                            {t("catalogue.notPublished")}
                          </span>
                        ) : (
                          <Riyal value={card.annualFee} locale={locale} />
                        )}
                      </dd>
                    </div>
                    {/* Always the "up to" figure beside the base rate, whatever the sort. */}
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-label text-platinum-deep">{t("catalogue.rewardRate")}</dt>
                      <dd className="text-end">
                        {card.rewardRate === null ? (
                          <span className="text-label text-platinum-deep">
                            {t("catalogue.rate.notPublished")}
                          </span>
                        ) : (
                          <span className="text-label font-semibold">
                            {t("catalogue.rate.upToBase", {
                              max: formatRate(t, locale, card.rewardRate.unit, card.rewardRate.max),
                              base: formatRate(
                                t,
                                locale,
                                card.rewardRate.unit,
                                card.rewardRate.base,
                              ),
                            })}
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <CardProvenance
                    sourceUrl={card.sourceUrl}
                    registeredSiteUrls={card.registeredSiteUrls}
                    verifiedAt={card.verifiedAt}
                    locale={locale}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
