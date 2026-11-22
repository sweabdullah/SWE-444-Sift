import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getMessages, getTranslator, isLocale } from "@/lib/i18n";
import { safeReturnTo } from "@/lib/auth/return-to";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { LoginForm } from "@/components/LoginForm";
import { loginAction } from "./actions";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string; signedOut?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = await searchParams;
  const returnTo = safeReturnTo(query.returnTo, locale);
  if (await auth()) redirect(returnTo);
  const copy = getMessages(locale).auth,
    t = getTranslator(locale);
  return (
    <main className="mx-auto max-w-lg space-y-6 px-5 py-8">
      <LocaleSwitch
        locale={locale}
        label={t("localeSwitch.label")}
        ariaLabel={t("localeSwitch.ariaLabel")}
      />
      <h1 className="text-2xl font-bold">{copy.loginTitle}</h1>
      {query.signedOut === "1" && <p role="status">{copy.signedOut}</p>}
      <LoginForm action={loginAction.bind(null, locale)} copy={copy} returnTo={returnTo} />
      <Link
        className="inline-block underline"
        href={`/${locale}/register?returnTo=${encodeURIComponent(returnTo)}`}
      >
        {copy.register}
      </Link>
    </main>
  );
}
