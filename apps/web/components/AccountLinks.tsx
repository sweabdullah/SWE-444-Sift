"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/locale";
import type { Messages } from "@/lib/i18n";
type Props = { locale: Locale; copy: Messages["auth"] };
function Links({ locale, copy }: Props) {
  const pathname = usePathname();
  const search = useSearchParams()?.toString();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    // Presentation only. Protected handlers always read and authorize their own server session.
    void fetch("/api/auth/session", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((session: { user?: { id?: string } } | null) => {
        if (!controller.signal.aborted) setSignedIn(Boolean(session?.user?.id));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSignedIn(false);
      });
    return () => controller.abort();
  }, [pathname]);
  const returnTo = encodeURIComponent(`${pathname ?? `/${locale}`}${search ? `?${search}` : ""}`);
  return (
    <nav
      aria-label={copy.navigation}
      className="mx-auto flex max-w-page flex-wrap justify-end gap-4 px-5 py-3 text-sm"
    >
      {!signedIn && (
        <>
          <Link href={`/${locale}/register?returnTo=${returnTo}`}>{copy.register}</Link>
          <Link href={`/${locale}/login?returnTo=${returnTo}`}>{copy.signIn}</Link>
        </>
      )}
      <Link href={`/${locale}/account`}>{copy.account}</Link>
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
