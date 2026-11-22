"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/locale";
import type { Messages } from "@/lib/i18n";
type Value = { locale: Locale; copy: Messages["auth"] };
const Context = createContext<Value | null>(null);
export function AuthUiProvider({ children, ...value }: Value & { children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuthUi() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing localized auth UI context");
  return value;
}
