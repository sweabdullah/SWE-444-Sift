import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@sift/schema";

/**
 * Locale routing. Every page lives under /ar or /en. A path without a locale prefix
 * (including the root "/") is redirected to the Arabic default, keeping the rest of the path.
 *
 * Next.js 16 renamed the "middleware" file convention to "proxy" (same behaviour).
 * SFT-10 may replace this with the i18n library's own middleware/proxy.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals (/_next/), API routes (/api/…) and real static files by known extension.
  // Anything else, including paths that merely contain a dot or start with "api", gets a locale.
  matcher: [
    "/((?!_next/|api/|.*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|txt|xml|json|webmanifest|map|css|js|woff2?)$).*)",
  ],
};
