import Image from "next/image";
import { notFound } from "next/navigation";
import { findPublishedCardsForList } from "@sift/db";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { Riyal } from "@/components/Riyal";
import { toCardList } from "@/lib/catalogue";
import { getTranslator, isLocale } from "@/lib/i18n";

// Read the published cards from the database on every request, so a change an administrator
// publishes shows up without a rebuild (and builds never need a database).
export const dynamic = "force-dynamic";

/** Home page: the published cards, read from the database. The full catalogue is SFT-18. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  const cards = toCardList(await findPublishedCardsForList(locale), locale);

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
            <p className="text-label text-platinum-deep">
              {t("catalogue.count", { count: cards.length })}
            </p>
          </div>
          <p className="text-label text-start text-platinum-deep">{t("catalogue.sortNote")}</p>

          {cards.length === 0 ? (
            <p className="rounded-md border border-line bg-white p-6 text-start">
              {t("catalogue.empty")}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => (
                <li
                  key={card.id}
                  className="flex flex-col gap-4 rounded-md border border-line bg-white p-5"
                >
                  <div className="flex flex-col gap-1">
                    <h3 className="text-start font-semibold">{card.name}</h3>
                    <p className="text-label text-start text-platinum-deep">{card.bankName}</p>
                  </div>
                  <dl className="mt-auto flex items-baseline justify-between gap-4 border-t border-line pt-3">
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
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
