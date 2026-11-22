"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/auth/register";
import type { Messages } from "@/lib/i18n";
import { passwordIssue } from "@/lib/auth/policy";
import { AuthNotice } from "./AuthNotice";
import { AuthIcon } from "./AuthIcon";
import { inputStyle, primaryButton } from "./styles";
export type CredentialsProps = {
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  copy: Messages["auth"];
  returnTo: string;
  initialError?: FormState["error"];
};
export function CredentialsForm({
  action,
  copy,
  returnTo,
  initialError = null,
  mode,
}: CredentialsProps & { mode: "register" | "login" }) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [localError, setLocalError] = useState<FormState["error"]>(null);
  const [dismissedState, setDismissedState] = useState<FormState | null>(null);
  const busy = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null),
    passwordInput = useRef<HTMLInputElement>(null);
  const [state, submit, pending] = useActionState(action, { error: initialError });
  useEffect(() => {
    if (!pending) busy.current = false;
  }, [pending, state]);
  const error = localError ?? (state !== dismissedState ? state.error : null);
  const emailError = error === "invalidEmail" || error === "duplicateEmail";
  const passwordError =
    error === "passwordRule" || error === "passwordTooLong" || error === "commonPassword";
  const feedbackId = `${mode}-feedback`;
  useEffect(() => {
    if (!error) return;
    if (emailError) emailInput.current?.focus();
    else if (passwordError) passwordInput.current?.focus();
    else document.getElementById(feedbackId)?.focus();
  }, [state, localError, error, emailError, passwordError, feedbackId]);
  function edit() {
    setLocalError(null);
    setDismissedState(state);
  }
  const pendingLabel = mode === "register" ? copy.registerPending : copy.loginPending;
  return (
    <form
      data-hydrated={hydrated}
      noValidate
      action={submit}
      aria-busy={pending}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        if (busy.current) {
          event.preventDefault();
          return;
        }
        const email = emailInput.current?.value ?? "";
        const password = passwordInput.current?.value ?? "";
        setEmail(email);
        setPassword(password);
        let issue: FormState["error"] =
          !email.trim() || emailInput.current?.validity.typeMismatch ? "invalidEmail" : null;
        if (!issue)
          issue =
            mode === "register" ? passwordIssue(password) : password ? null : "invalidCredentials";
        setDismissedState(state);
        setLocalError(issue);
        if (issue) {
          if (issue === "invalidEmail") emailInput.current?.focus();
          else passwordInput.current?.focus();
          event.preventDefault();
          return;
        }
        busy.current = true;
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {error && !emailError && !passwordError && (
        <AuthNotice id={feedbackId} tone="error">
          {copy.errors[error]}
        </AuthNotice>
      )}
      <div>
        <label htmlFor={`${mode}-email`} className="mb-2 block text-sm font-medium">
          {copy.email}
        </label>
        <input
          ref={emailInput}
          id={`${mode}-email`}
          className={inputStyle}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          required
          dir="ltr"
          value={email}
          readOnly={pending}
          aria-invalid={emailError || undefined}
          aria-describedby={emailError ? `${mode}-email-error` : undefined}
          onChange={(event) => {
            setEmail(event.target.value);
            edit();
          }}
        />
        {emailError && (
          <p id={`${mode}-email-error`} role="alert" className="mt-2 text-sm font-medium">
            {copy.errors[error]}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${mode}-password`} className="mb-2 block text-sm font-medium">
          {copy.password}
        </label>
        <div className="flex gap-2">
          <input
            ref={passwordInput}
            id={`${mode}-password`}
            className={`${inputStyle} flex-1`}
            name="password"
            type={visible ? "text" : "password"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            minLength={mode === "register" ? 8 : undefined}
            required
            dir="auto"
            value={password}
            readOnly={pending}
            aria-invalid={passwordError || undefined}
            aria-describedby={
              `${mode === "register" && !passwordError ? `${mode}-password-hint ` : ""}${passwordError ? `${mode}-password-error` : ""}`.trim() ||
              undefined
            }
            onChange={(event) => {
              setPassword(event.target.value);
              edit();
            }}
          />
          <button
            type="button"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-platinum-deep text-graphite hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-graphite disabled:opacity-60"
            aria-label={visible ? copy.hidePassword : copy.showPassword}
            aria-pressed={visible}
            disabled={pending}
            onClick={() => setVisible((value) => !value)}
          >
            <AuthIcon kind={visible ? "hidden" : "eye"} />
          </button>
        </div>
        {mode === "register" && !passwordError && (
          <p id={`${mode}-password-hint`} className="mt-2 text-sm leading-6 text-platinum-deep">
            {copy.passwordRule}
          </p>
        )}
        {passwordError && (
          <p id={`${mode}-password-error`} role="alert" className="mt-2 text-sm font-medium">
            {copy.errors[error]}
          </p>
        )}
      </div>
      <button className={`${primaryButton} w-full`} disabled={pending}>
        {pending ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
        {pending ? pendingLabel : mode === "register" ? copy.register : copy.signIn}
      </button>
      <p role="status" className="sr-only">
        {pending ? pendingLabel : ""}
      </p>
    </form>
  );
}
