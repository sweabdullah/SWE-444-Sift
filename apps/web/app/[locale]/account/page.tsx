import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, AccessDenied, type Identity } from "@/lib/auth/guards";
import { authHref } from "@/lib/auth/return-to";
import { getMessages, isLocale } from "@/lib/i18n";
import { AuthShell } from "@/components/auth/AuthShell";
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
      showCatalogueLink={false}
    >
      <div className="flex min-w-0 items-start gap-4 rounded-md border border-line p-4">
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
