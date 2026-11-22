"use server";
import { redirect } from "next/navigation";
import { revokeAndSignOut } from "@/lib/auth/server";
import type { FormState } from "@/lib/auth/register";
import { isLocale, type Locale } from "@/lib/locale";
import { safeReturnTo } from "@/lib/auth/return-to";
export async function logoutAction(
  locale: Locale,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!isLocale(locale)) return { error: "unavailable" };
  try {
    await revokeAndSignOut();
  } catch {
    return { error: "unavailable" };
  }
  redirect(
    `/${locale}/login?signedOut=1&returnTo=${encodeURIComponent(safeReturnTo(form.get("returnTo"), locale))}`,
  );
}
