"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localizedPath, otherLocale, type Locale } from "@/lib/i18n";

/**
 * Language switch. Links to the SAME page in the other locale (only the /ar|/en segment
 * changes), so switching never returns the visitor to the home page.
 * Labels come from the server as props so the client bundle needs no catalogue.
 */
export function LocaleSwitch({
  locale,
  label,
  ariaLabel,
}: {
  locale: Locale;
  label: string;
  ariaLabel: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const target = otherLocale(locale);

  return (
    <Link
      href={localizedPath(pathname, target)}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      className="rounded-md border border-line bg-white ps-4 pe-4 py-2 text-label text-platinum-deep hover:border-platinum-deep"
    >
      {label}
    </Link>
  );
}
