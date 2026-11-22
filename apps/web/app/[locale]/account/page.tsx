import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, AccessDenied, type Identity } from "@/lib/auth/guards";
import { authHref } from "@/lib/auth/return-to";
import { getMessages, isLocale } from "@/lib/i18n";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthIcon } from "@/components/auth/AuthIcon";
import { primaryButton, secondaryButton } from "@/components/auth/styles";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  let identity: Identity;
  try {
    identity = await requireUser();
  } catch (error) {
    if (!(error instanceof AccessDenied)) throw error;
    redirect(`${authHref("login", `/${locale}/account`, locale)}&reason=signin`);
  }
  const copy = getMessages(locale).auth;
  return (
    <AuthShell
      locale={locale}
      copy={copy}
      title={copy.account}
      description={copy.accountDescription}
    >
      <AuthNotice tone="success">{copy.signedIn}</AuthNotice>
      <div className="mt-6 flex min-w-0 items-start gap-4 rounded-md border border-line p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-mist text-platinum-deep">
          <AuthIcon kind="lock" className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-platinum-deep">{copy.email}</p>
          <p className="mt-1 break-all font-medium">
            <bdi dir="ltr">{identity.email}</bdi>
          </p>
        </div>
      </div>
      <dl className="mt-6 divide-y divide-line rounded-md border border-line px-4">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-4">
          <dt className="text-sm text-platinum-deep">{copy.roleLabel}</dt>
          <dd className="text-sm font-medium">
            {identity.role === "admin" ? copy.roleAdmin : copy.roleUser}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-4">
          <dt className="text-sm text-platinum-deep">{copy.accountStatus}</dt>
          <dd className="text-sm font-medium">{copy.activeSession}</dd>
        </div>
      </dl>
      <nav aria-label={copy.navigation} className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link className={primaryButton} href={`/${locale}`}>
          {copy.catalogue}
        </Link>
        <Link className={secondaryButton} href={authHref("logout", `/${locale}/account`, locale)}>
          {copy.signOut}
        </Link>
      </nav>
    </AuthShell>
  );
}
