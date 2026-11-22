import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getMessages, isLocale } from "@/lib/i18n";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  if (!session?.user.id) redirect(`/${locale}/register`);
  const copy = getMessages(locale).auth;
  return (
    <main className="mx-auto max-w-lg space-y-6 px-5 py-8">
      <h1 className="text-2xl font-bold">{copy.account}</h1>
      <p>
        {copy.signedIn}: <bdi>{session.user.email}</bdi>
      </p>
      <Link className="underline" href={`/${locale}`}>
        {copy.catalogue}
      </Link>
    </main>
  );
}
