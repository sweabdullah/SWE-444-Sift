"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

// Placeholder 404 copy; SFT-10 moves it into the message catalogs.
const copy = {
  ar: { title: "الصفحة غير موجودة", home: "العودة إلى الصفحة الرئيسية" },
  en: { title: "Page not found", home: "Back to the home page" },
} as const;

/** 404 for /ar/* and /en/*: rendered inside app/[locale]/layout.tsx, so lang/dir are set. */
export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const raw = params.locale ?? "";
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
