import Link from "next/link";
import { AuthError } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { auth, signIn, confirmedSignOut } from "@/lib/auth-spike/server";
import { spikeEnabled } from "@/lib/auth-spike/config";
import { spikeCopy } from "@/lib/auth-spike/copy";
import { getTranslator } from "@/lib/i18n";
import { isLocale } from "@/lib/locale";
import { LocaleSwitch } from "@/components/LocaleSwitch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

/** Server component: auth() validates both the JWT and its database session row. */
export default async function AuthSpikePage({ params, searchParams }: Props) {
  if (!spikeEnabled()) notFound();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = spikeCopy[locale];
  const t = getTranslator(locale);
  const destination = `/${locale}/auth-spike`;
  const session = await auth();
  const { error } = await searchParams;

  async function login(form: FormData) {
    "use server";
    if (!spikeEnabled()) notFound();
    try {
      await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirectTo: destination,
      });
    } catch (error) {
      if (error instanceof AuthError) redirect(`${destination}?error=credentials`);
      throw error; // Preserve Next.js's successful redirect.
    }
  }

  async function logout() {
    "use server";
    if (!spikeEnabled()) notFound();
    await confirmedSignOut(destination);
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <LocaleSwitch
        locale={locale}
        label={t("localeSwitch.label")}
        ariaLabel={t("localeSwitch.ariaLabel")}
      />
      <h1 className="text-2xl font-bold">{copy.title}</h1>
      <p>{copy.intro}</p>
      {session ? (
        <>
          <p>
            {copy.signedIn}: <bdi>{session.user.email}</bdi>
          </p>
          <p>
            {copy.role}: {copy[session.user.role]}
          </p>
          <form action={logout}>
            <button className="rounded border px-4 py-2">{copy.signOut}</button>
          </form>
        </>
      ) : (
        <>
          <p>{copy.signedOut}</p>
          {error && <p role="alert">{copy.error}</p>}
          <form action={login} className="space-y-4">
            <label className="block">
              {copy.email}
              <input
                className="block w-full rounded border p-2"
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
                dir="ltr"
              />
            </label>
            <label className="block">
              {copy.password}
              <input
                className="block w-full rounded border p-2"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                dir="ltr"
              />
            </label>
            <button className="rounded border px-4 py-2">{copy.signIn}</button>
          </form>
        </>
      )}
      <p>
        <Link prefetch={false} href="/api/auth-spike-demo/user" className="underline">
          {copy.userRoute}
        </Link>
      </p>
      <p>
        <Link prefetch={false} href="/api/auth-spike-demo/admin" className="underline">
          {copy.adminRoute}
        </Link>
      </p>
    </main>
  );
}
