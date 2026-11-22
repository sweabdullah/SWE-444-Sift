"use server";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/lib/auth/server";
import type { FormState } from "@/lib/auth/register";
import { isLocale, type Locale } from "@/lib/locale";
import { safeReturnTo } from "@/lib/auth/return-to";
export async function loginAction(
  locale: Locale,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!isLocale(locale)) return { error: "unavailable" };
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: safeReturnTo(form.get("returnTo"), locale),
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) return { error: "invalidCredentials" };
    if (error instanceof AuthError) return { error: "unavailable" };
    throw error;
  }
  return { error: null };
}
