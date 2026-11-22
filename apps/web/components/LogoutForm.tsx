"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/auth/register";
import type { Messages } from "@/lib/i18n";
export function LogoutForm({
  action,
  copy,
  returnTo,
}: {
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  copy: Messages["auth"];
  returnTo: string;
}) {
  const [state, submit, pending] = useActionState(action, { error: null });
  return (
    <form action={submit} className="space-y-5">
      <input type="hidden" name="returnTo" value={returnTo} />
      {state.error && (
        <p role="alert" aria-live="polite">
          {copy.errors[state.error]}
        </p>
      )}
      <button
        className="rounded border border-line bg-white px-4 py-3 disabled:opacity-50"
        disabled={pending}
      >
        {pending ? copy.pending : copy.confirmSignOut}
      </button>
    </form>
  );
}
