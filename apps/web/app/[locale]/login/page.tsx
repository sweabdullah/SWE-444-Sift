import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getMessages, isLocale } from "@/lib/i18n";
import { safeReturnTo, authHref } from "@/lib/auth/return-to";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { textLink } from "@/components/auth/styles";
import { LoginForm } from "@/components/LoginForm";
import { loginAction } from "./actions";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string; signedOut?: string; reason?: string; error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const returnTo = safeReturnTo(query.returnTo, locale);
  if (await auth()) redirect(returnTo);
  const copy = getMessages(locale).auth;
  return (
    <AuthShell
      locale={locale}
      copy={copy}
      title={copy.loginTitle}
      description={copy.loginDescription}
    >
      {query.signedOut === "1" ? (
        <div className="mb-6">
          <AuthNotice tone="success">{copy.signedOut}</AuthNotice>
        </div>
      ) : query.reason === "signin" ? (
        <div className="mb-6">
          <AuthNotice>{copy.sessionRequired}</AuthNotice>
        </div>
      ) : null}
      <LoginForm
        action={loginAction.bind(null, locale)}
        copy={copy}
        returnTo={returnTo}
        initialError={query.error ? "invalidCredentials" : null}
      />
      <p className="mt-6 flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm text-platinum-deep">
        <span>{copy.newAccount}</span>
        <Link className={textLink} href={authHref("register", returnTo, locale)}>
          {copy.register}
        </Link>
      </p>
    </AuthShell>
  );
}
