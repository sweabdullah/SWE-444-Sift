import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getMessages, isLocale } from "@/lib/i18n";
import { safeReturnTo, authHref } from "@/lib/auth/return-to";
import { AuthShell } from "@/components/auth/AuthShell";
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
  if (!(await auth())) redirect(authHref("login", returnTo, locale));
  const copy = getMessages(locale).auth;
  return (
    <AuthShell
      locale={locale}
      copy={copy}
      title={copy.logoutQuestion}
      description={copy.logoutDescription}
    >
      <LogoutForm action={logoutAction.bind(null, locale)} copy={copy} returnTo={returnTo} />
    </AuthShell>
  );
}
