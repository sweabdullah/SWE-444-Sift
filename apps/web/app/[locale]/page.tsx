import Image from "next/image";
import { notFound } from "next/navigation";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { getTranslator, isLocale } from "@/lib/i18n";

/** Placeholder home page. Real content arrives with the catalogue stories. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);

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
      <main className="flex flex-1 flex-col justify-center py-16">
        {/* Marketing headline (32px): the only place the display serif is used. */}
        <h1 className="font-display text-h1 text-start">{t("home.title")}</h1>
        <p className="mt-3 max-w-xl text-start text-platinum-deep">{t("home.tagline")}</p>
      </main>
    </div>
  );
}
