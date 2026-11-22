import { isLocale, type Locale } from "@/lib/locale";
/** Only locale-scoped, internal destinations; never turn authentication into an open redirect. */
export function safeReturnTo(value: unknown, locale: Locale): string {
  const fallback = `/${locale}/account`;
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    Array.from(value).some(
      (c) => c === String.fromCharCode(92) || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127,
    )
  )
    return fallback;
  try {
    const url = new URL(value, "https://sift.invalid");
    if (url.origin !== "https://sift.invalid" || /%2f|%5c|%0[ad]/i.test(url.pathname))
      return fallback;
    const path = decodeURIComponent(url.pathname);
    const segments = path.split("/");
    if (
      !isLocale(segments[1] ?? "") ||
      ["login", "register", "logout", "auth-spike"].includes(segments[2] ?? "")
    )
      return fallback;
    segments[1] = locale;
    return `${segments.join("/")}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
