"use client";
import Link from "next/link";
import { useAuthUi } from "./AuthUiProvider";
import { AuthShell } from "./AuthShell";
import { AuthNotice } from "./AuthNotice";
import { primaryButton, secondaryButton } from "./styles";
export function AuthPageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, copy } = useAuthUi();
  return (
    <AuthShell
      locale={locale}
      copy={copy}
      title={copy.pageErrorTitle}
      description={copy.pageErrorDescription}
    >
      <AuthNotice tone="error">{copy.errors.unavailable}</AuthNotice>
      <div className="mt-6 flex flex-wrap gap-3">
        <button className={primaryButton} onClick={reset}>
          {copy.retry}
        </button>
        <Link className={secondaryButton} href={`/${locale}`}>
          {copy.catalogue}
        </Link>
      </div>
    </AuthShell>
  );
}
