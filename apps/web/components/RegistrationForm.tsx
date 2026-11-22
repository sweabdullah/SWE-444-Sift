"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/auth/register";
import type { Messages } from "@/lib/i18n";

type Props = {
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  copy: Messages["auth"];
};
export function RegistrationForm({ action, copy }: Props) {
  const [state, submit, pending] = useActionState(action, { error: null });
  return (
    <form action={submit} className="space-y-5">
      {state.error && (
        <p role="alert" aria-live="polite">
          {copy.errors[state.error]}
        </p>
      )}
      <label className="block">
        {copy.email}
        <input
          className="mt-2 block w-full rounded border border-line p-3"
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
          className="mt-2 block w-full rounded border border-line p-3"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={15}
          required
          aria-describedby="password-rule"
          dir="ltr"
        />
      </label>
      <p id="password-rule" className="text-sm">
        {copy.passwordRule}
      </p>
      <button
        className="rounded border border-line bg-white px-4 py-3 disabled:opacity-50"
        disabled={pending}
      >
        {pending ? copy.pending : copy.register}
      </button>
    </form>
  );
}
