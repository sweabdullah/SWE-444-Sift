"use client";
import { CredentialsForm, type CredentialsProps } from "@/components/auth/CredentialsForm";
export function LoginForm(props: CredentialsProps) {
  return <CredentialsForm {...props} mode="login" />;
}
