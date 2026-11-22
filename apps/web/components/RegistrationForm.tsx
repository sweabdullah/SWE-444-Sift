"use client";
import { CredentialsForm, type CredentialsProps } from "@/components/auth/CredentialsForm";
export function RegistrationForm(props: CredentialsProps) {
  return <CredentialsForm {...props} mode="register" />;
}
