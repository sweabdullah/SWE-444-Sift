import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LOCALES, directionOf, getTranslator, isLocale } from "@/lib/i18n";
import { fontVariables } from "@/lib/fonts";
import { SiteFooter } from "@/components/SiteFooter";
import "../globals.css";

// Only /ar and /en exist; any other first segment is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslator(locale);
  return {
    title: { default: t("meta.siteName"), template: `%s · ${t("meta.siteName")}` },
    description: t("meta.description"),
  };
}

/** Root layout: <html lang dir> follows the locale segment. */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={directionOf(locale)} className={fontVariables}>
      <body className="min-h-dvh bg-mist font-sans text-body text-graphite antialiased">
        {children}
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
