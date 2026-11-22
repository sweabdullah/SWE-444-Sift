"use server";
import { safeReturnTo } from "@/lib/auth/return-to";
import { AuthError } from "next-auth";
import { prisma } from "@sift/db";
import { isLocale, type Locale } from "@/lib/locale";
import { registerAccount, type FormState } from "@/lib/auth/register";
import { signIn } from "@/lib/auth/server";

export async function registerAction(
  locale: Locale,
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  if (!isLocale(locale)) return { error: "unavailable" };
  const result = await registerAccount(prisma, {
    email: form.get("email"),
    password: form.get("password"),
    locale,
  });
  if (!result.ok) return { error: result.error };
  try {
    await signIn("credentials", {
      email: result.email,
      password: form.get("password"),
      redirectTo: safeReturnTo(form.get("returnTo"), locale),
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "createdLoginFailed" };
    throw error; // Next.js redirects are successful control flow, not form errors.
  }
  return { error: null };
}
