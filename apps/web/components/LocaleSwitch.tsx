"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
// Client component: import from lib/locale (no catalogues), never from lib/i18n.
import { localizedPath, otherLocale, type Locale } from "@/lib/locale";

type Props = { locale: Locale; label: string; ariaLabel: string };

/**
 * Language switch. Links to the SAME page in the other locale (only the /ar|/en segment
 * changes) and keeps the query string, so switching never returns the visitor home or
 * drops their filters. Labels come from the server as props, so no catalogue ships here.
 */
export function LocaleSwitch(props: Props) {
  // useSearchParams needs a Suspense boundary on statically rendered pages; until it
  // resolves, the fallback links to the same path without the query.
  return (
    <Suspense fallback={<SwitchLink {...props} search="" />}>
      <SwitchWithQuery {...props} />
    </Suspense>
  );
}

function SwitchWithQuery(props: Props) {
  const search = useSearchParams()?.toString() ?? "";
  return <SwitchLink {...props} search={search} />;
}

function SwitchLink({ locale, label, ariaLabel, search }: Props & { search: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const target = otherLocale(locale);

  return (
    <Link
      href={localizedPath(pathname, target, search)}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      className="rounded-md border border-line bg-white ps-4 pe-4 py-2 text-label text-platinum-deep hover:border-platinum-deep"
    >
      {label}
    </Link>
  );
}
