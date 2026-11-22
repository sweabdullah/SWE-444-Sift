"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/locale";
import type { Messages } from "@/lib/i18n";
import { authHref, isAuthPage, safeReturnTo } from "@/lib/auth/return-to";
import { textLink } from "@/components/auth/styles";
type Props = { locale: Locale; copy: Messages["auth"] };
function Links({ locale, copy }: Props) {
  const pathname = usePathname() ?? `/${locale}`;
  const search = useSearchParams()?.toString();
  const authPage = isAuthPage(pathname);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (authPage) return;
    const controller = new AbortController();
    // Presentation only: each protected server handler still validates its own session/role.
    void fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((session: { user?: { id?: string } } | null) => {
        if (!controller.signal.aborted) setSignedIn(Boolean(session?.user?.id));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSignedIn(false);
      });
    return () => controller.abort();
  }, [pathname, authPage]);
  if (authPage) return null;
  const destination = safeReturnTo(`${pathname}${search ? `?${search}` : ""}`, locale);
  return (
    <nav
      aria-label={copy.navigation}
      aria-busy={signedIn === null}
      className="mx-auto flex w-full max-w-page flex-wrap items-center justify-end gap-x-5 gap-y-2 px-6 py-3 text-label"
    >
      {signedIn !== true && (
        <>
          <Link
            className={`${textLink} inline-flex min-h-11 items-center`}
            href={authHref("login", destination, locale)}
          >
            {copy.signIn}
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-md bg-graphite px-4 py-2 font-medium text-white hover:bg-graphite-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-graphite"
            href={authHref("register", destination, locale)}
          >
            {copy.register}
          </Link>
        </>
      )}
      {signedIn === true && (
        <Link
          className={`${textLink} inline-flex min-h-11 items-center`}
          href={`/${locale}/account`}
        >
          {copy.account}
        </Link>
      )}
      {signedIn === true && (
        <Link
          className={`${textLink} inline-flex min-h-11 items-center`}
          href={authHref("logout", destination, locale)}
        >
          {copy.signOut}
        </Link>
      )}
    </nav>
  );
}
export function AccountLinks(props: Props) {
  return (
    <Suspense fallback={null}>
      <Links {...props} />
    </Suspense>
  );
}
