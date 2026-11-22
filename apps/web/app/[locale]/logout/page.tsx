import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getMessages, isLocale } from "@/lib/i18n";
import { safeReturnTo } from "@/lib/auth/return-to";
import { LogoutForm } from "@/components/LogoutForm";
import { logoutAction } from "./actions";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function LogoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const returnTo = safeReturnTo((await searchParams).returnTo, locale);
  if (!(await auth())) redirect(`/${locale}/login?returnTo=${encodeURIComponent(returnTo)}`);
  const copy = getMessages(locale).auth;
  return (
    <main className="mx-auto max-w-lg space-y-6 px-5 py-8">
      <h1 className="text-2xl font-bold">{copy.logoutTitle}</h1>
      <p>{copy.logoutQuestion}</p>
      <LogoutForm action={logoutAction.bind(null, locale)} copy={copy} returnTo={returnTo} />
      <Link className="underline" href={returnTo}>
        {copy.cancel}
      </Link>
    </main>
  );
}
