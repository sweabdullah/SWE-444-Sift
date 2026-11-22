import { isLocale, type Locale } from "@/lib/locale";
export const AUTH_PAGES = ["login", "register", "logout", "account", "auth-spike"] as const;
export function isAuthPage(pathname: string) {
  return (AUTH_PAGES as readonly string[]).includes(pathname.split("/")[2] ?? "");
}
function forbidden(value: string) {
  return Array.from(value).some(
    (c) => c === String.fromCharCode(92) || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
  );
}
/** Canonicalize bounded legacy wrappers without decoding legitimate destination query values. */
export function safeReturnTo(value: unknown, locale: Locale): string {
  const fallback = `/${locale}/account`;
  if (typeof value !== "string") return fallback;
  let candidate = value;
  try {
    for (let depth = 0; depth < 8; depth++) {
      if (!candidate || candidate.length > 4096 || forbidden(candidate)) return fallback;
      if (!candidate.startsWith("/")) {
        candidate = decodeURIComponent(candidate);
        continue;
      }
      if (candidate.startsWith("//")) return fallback;
      const url = new URL(candidate, "https://sift.invalid");
      if (url.origin !== "https://sift.invalid" || /%2f|%5c/i.test(url.pathname)) return fallback;
      const decoded = decodeURIComponent(url.pathname);
      if (forbidden(decoded) || /%[0-9a-f]{2}/i.test(decoded)) return fallback;
      const segments = decoded.split("/");
      if (!isLocale(segments[1] ?? "")) return fallback;
      if (["login", "register", "logout", "auth-spike"].includes(segments[2] ?? "")) {
        candidate = url.searchParams.get("returnTo") ?? "";
        continue;
      }
      const output = url.pathname.split("/");
      output[1] = locale;
      return `${output.join("/")}${url.search}${url.hash}`;
    }
  } catch {
    return fallback;
  }
  return fallback;
}
export function authHref(
  page: "login" | "register" | "logout",
  destination: unknown,
  locale: Locale,
) {
  return `/${locale}/${page}?returnTo=${encodeURIComponent(safeReturnTo(destination, locale))}`;
}
