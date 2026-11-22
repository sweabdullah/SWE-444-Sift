import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/locale";
import type { Messages } from "@/lib/i18n";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { AuthIcon } from "./AuthIcon";
import { textLink } from "./styles";
export function AuthShell({
  locale,
  copy,
  title,
  description,
  children,
  showCatalogueLink = true,
}: {
  locale: Locale;
  copy: Messages["auth"];
  title: string;
  description: string;
  children: ReactNode;
  showCatalogueLink?: boolean;
}) {
  return (
    <div className="auth-surface mx-auto flex w-full max-w-page flex-1 flex-col px-5 sm:px-8">
      <a
        href="#auth-content"
        className="sr-only rounded-md bg-white p-3 font-medium focus:not-sr-only focus:mt-4"
      >
        {copy.skipContent}
      </a>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line py-5 sm:py-6">
        <Link
          href={`/${locale}`}
          aria-label={copy.siftHome}
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite"
        >
          <Image
            src={`/sift-lockup-${locale}-on-light.svg`}
            alt={copy.siftHome}
            width={160}
            height={48}
            className="h-10 w-auto"
            unoptimized
            priority
          />
        </Link>
        <div className="flex items-center gap-4 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
          <LocaleSwitch locale={locale} label={copy.switchLabel} ariaLabel={copy.switchAria} />
        </div>
      </header>
      <main className="grid items-start gap-8 py-6 sm:py-10 lg:grid-cols-[0.9fr_1fr] lg:gap-12 lg:py-12">
        <aside
          className="hidden rounded-lg bg-graphite p-8 text-mist lg:block lg:p-10 lg:max-w-none"
          aria-label={copy.aboutSift}
        >
          <p className="text-label font-medium text-platinum">{copy.eyebrow}</p>
          <h2 className="mt-5 font-display text-display">{copy.asideTitle}</h2>
          <p className="mt-5 max-w-sm text-body text-platinum">{copy.asideDescription}</p>
          <ul className="mt-9 space-y-6">
            {(
              [
                ["source", copy.sourceTitle, copy.sourceDescription],
                ["language", copy.languageTitle, copy.languageDescription],
                ["lock", copy.sessionTitle, copy.sessionDescription],
              ] as const
            ).map(([icon, heading, body]) => (
              <li key={icon} className="flex gap-4">
                <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line-dark bg-surface text-platinum">
                  <AuthIcon kind={icon} />
                </span>
                <div>
                  <h3 className="font-medium text-white">{heading}</h3>
                  <p className="mt-1 text-sm leading-6 text-platinum">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <section
          id="auth-content"
          aria-labelledby="auth-heading"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-xl rounded-lg border border-line bg-white p-6 shadow-sm outline-none sm:p-8 lg:p-10 lg:max-w-none"
        >
          <p className="text-label font-medium text-platinum-deep">{copy.eyebrow}</p>
          <h1 id="auth-heading" className="mt-2 text-title font-bold text-graphite">
            {title}
          </h1>
          <p className="mt-3 text-body text-platinum-deep">{description}</p>
          <div className="mt-7">{children}</div>
          {showCatalogueLink && (
            <div className="mt-7 border-t border-line pt-5 text-sm">
              <Link className={textLink} href={`/${locale}`}>
                {copy.browseWithoutAccount}
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
