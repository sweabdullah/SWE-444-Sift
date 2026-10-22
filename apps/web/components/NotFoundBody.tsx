"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
// Client component: import from lib/locale (no catalogues), never from lib/i18n.
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/locale";

/** Body of the 404 page. Strings come from the server; the locale comes from the URL. */
export function NotFoundBody({ copy }: { copy: Record<Locale, { title: string; home: string }> }) {
  const params = useParams<{ locale?: string }>();
  const raw = params?.locale ?? "";
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const t = copy[locale];
  return (
    <main className="mx-auto flex min-h-dvh max-w-page flex-col justify-center gap-4 px-6">
      <h1 className="text-title text-start">{t.title}</h1>
      <Link href={`/${locale}`} className="text-start text-platinum-deep underline">
        {t.home}
      </Link>
    </main>
  );
}
