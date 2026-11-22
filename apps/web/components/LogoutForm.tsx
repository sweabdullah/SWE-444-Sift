"use client";
import Link from "next/link";
import { useActionState, useRef, useEffect } from "react";
import type { FormState } from "@/lib/auth/register";
import type { Messages } from "@/lib/i18n";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { primaryButton, secondaryButton } from "@/components/auth/styles";
export function LogoutForm({
  action,
  copy,
  returnTo,
}: {
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  copy: Messages["auth"];
  returnTo: string;
}) {
  const busy = useRef(false);
  const [state, submit, pending] = useActionState(action, { error: null });
  useEffect(() => {
    if (!pending) busy.current = false;
  }, [pending, state]);
  useEffect(() => {
    if (state.error) document.getElementById("logout-feedback")?.focus();
  }, [state]);
  return (
    <form
      action={submit}
      aria-busy={pending}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        if (busy.current) event.preventDefault();
        else busy.current = true;
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {state.error && (
        <AuthNotice id="logout-feedback" tone="error">
          {copy.errors[state.error]}
        </AuthNotice>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <button className={primaryButton} disabled={pending}>
          {pending ? copy.logoutPending : copy.confirmSignOut}
        </button>
        <Link
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
          className={secondaryButton}
          href={returnTo}
        >
          {copy.cancel}
        </Link>
      </div>
      <p role="status" className="sr-only">
        {pending ? copy.logoutPending : ""}
      </p>
    </form>
  );
}
