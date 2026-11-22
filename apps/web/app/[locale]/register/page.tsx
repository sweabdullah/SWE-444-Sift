import { safeReturnTo } from "@/lib/auth/return-to";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getMessages, getTranslator, isLocale } from "@/lib/i18n";
import { LocaleSwitch } from "@/components/LocaleSwitch";
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
  const t = getTranslator(locale);
  return (
    <main className="mx-auto max-w-lg space-y-6 px-5 py-8">
      <LocaleSwitch
        locale={locale}
        label={t("localeSwitch.label")}
        ariaLabel={t("localeSwitch.ariaLabel")}
      />
      <h1 className="text-2xl font-bold">{copy.registerTitle}</h1>
      <RegistrationForm
        action={registerAction.bind(null, locale)}
        copy={copy}
        returnTo={returnTo}
      />
      <Link
        className="inline-block underline"
        href={`/${locale}/login?returnTo=${encodeURIComponent(returnTo)}`}
      >
        {copy.signIn}
      </Link>
      <Link className="inline-block underline" href={`/${locale}`}>
        {copy.catalogue}
      </Link>
    </main>
  );
}
