import { NotFoundBody } from "@/components/NotFoundBody";
import { LOCALES, getTranslator, type Locale } from "@/lib/i18n";

/**
 * 404 for /ar/* and /en/*: rendered inside app/[locale]/layout.tsx, so lang/dir are set.
 * not-found pages receive no params, so the server passes just these two strings per locale
 * and the client body picks the locale from the URL. Reading headers() here instead would
 * make every page under [locale] dynamic.
 */
export default function NotFound() {
  const copy = Object.fromEntries(
    LOCALES.map((locale) => {
      const t = getTranslator(locale);
      return [locale, { title: t("notFound.title"), home: t("notFound.home") }];
    }),
  ) as Record<Locale, { title: string; home: string }>;
  return <NotFoundBody copy={copy} />;
}
