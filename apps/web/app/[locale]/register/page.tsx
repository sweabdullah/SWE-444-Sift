import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { safeReturnTo, authHref } from "@/lib/auth/return-to";
import { getMessages, isLocale } from "@/lib/i18n";
import { AuthShell } from "@/components/auth/AuthShell";
import { textLink } from "@/components/auth/styles";
import { RegistrationForm } from "@/components/RegistrationForm";
import { registerAction } from "./actions";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const returnTo = safeReturnTo((await searchParams).returnTo, locale);
  if (await auth()) redirect(returnTo);
  const copy = getMessages(locale).auth;
  return (
    <AuthShell
      locale={locale}
      copy={copy}
      title={copy.registerTitle}
      description={copy.registerDescription}
    >
      <RegistrationForm
        action={registerAction.bind(null, locale)}
        copy={copy}
        returnTo={returnTo}
      />
      <p className="mt-6 flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm text-platinum-deep">
        <span>{copy.alreadyAccount}</span>
        <Link className={textLink} href={authHref("login", returnTo, locale)}>
          {copy.signIn}
        </Link>
      </p>
    </AuthShell>
  );
}
