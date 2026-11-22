import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, AccessDenied, type Identity } from "@/lib/auth/guards";
import { getMessages, isLocale } from "@/lib/i18n";
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
    redirect(`/${locale}/login?returnTo=${encodeURIComponent(`/${locale}/account`)}`);
  }
  const copy = getMessages(locale).auth;
  return (
    <main className="mx-auto max-w-lg space-y-6 px-5 py-8">
      <h1 className="text-2xl font-bold">{copy.account}</h1>
      <p>
        {copy.signedIn}: <bdi>{identity.email}</bdi>
      </p>
      <nav aria-label={copy.navigation} className="flex flex-wrap gap-4">
        <Link className="underline" href={`/${locale}/logout`}>
          {copy.signOut}
        </Link>
        <Link className="underline" href={`/${locale}`}>
          {copy.catalogue}
        </Link>
      </nav>
    </main>
  );
}
