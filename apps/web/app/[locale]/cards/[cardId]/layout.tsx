import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { CardDetailFeedbackProvider } from "@/components/CardDetailFeedback";
import { getTranslator, isLocale } from "@/lib/i18n";

export default async function CardDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslator(locale);
  return (
    <div className="mx-auto flex min-h-dvh max-w-page flex-col px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <Link href={`/${locale}`} className="underline underline-offset-4">
          {t("cardDetail.back")}
        </Link>
        <LocaleSwitch
          locale={locale}
          label={t("localeSwitch.label")}
          ariaLabel={t("localeSwitch.ariaLabel")}
        />
      </header>
      <main className="w-full max-w-3xl pt-6 pb-16">
        <CardDetailFeedbackProvider
          copy={{
            loading: t("cardDetail.loading"),
            error: t("cardDetail.error"),
            retry: t("cardDetail.retry"),
          }}
        >
          {children}
        </CardDetailFeedbackProvider>
      </main>
    </div>
  );
}
