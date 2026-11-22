import { Prisma, type PrismaClient } from "@sift/db";
import { z } from "zod";
import { hashPassword, validPasswordLength } from "./password";
import type { Locale } from "@/lib/locale";

export type RegistrationError = "invalidEmail" | "passwordRule" | "duplicateEmail" | "unavailable";
export type FormState = {
  error: RegistrationError | "createdLoginFailed" | "invalidCredentials" | null;
};
const emailSchema = z.email().max(254);

export async function registerAccount(
  db: PrismaClient,
  input: { email: unknown; password: unknown; locale: Locale },
): Promise<{ ok: true; email: string } | { ok: false; error: RegistrationError }> {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!emailSchema.safeParse(email).success) return { ok: false, error: "invalidEmail" };
  if (typeof input.password !== "string" || !validPasswordLength(input.password))
    return { ok: false, error: "passwordRule" };
  try {
    const passwordHash = await hashPassword(input.password);
    // Explicit fields prevent a submitted role/emailVerified/digest preference from being trusted.
    // The unique email constraint arbitrates concurrent registrations; no racy pre-check.
    await db.user.create({
      data: {
        email,
        passwordHash,
        locale: input.locale,
        role: "user",
        emailVerified: null,
        digestOptIn: false,
      },
    });
    return { ok: true, email };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.includes("email")
    )
      return { ok: false, error: "duplicateEmail" };
    return { ok: false, error: "unavailable" };
  }
}
