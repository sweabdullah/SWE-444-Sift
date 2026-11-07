import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import LocaleLayout, { generateMetadata, generateStaticParams } from "@/app/[locale]/layout";
import HomePage from "@/app/[locale]/page";
import { Riyal } from "@/components/Riyal";
import { proxy } from "@/proxy";
import { formatDate, formatNumber, formatSAR } from "./format";
import { getTranslator, type MessageKey } from "./i18n";

// next/font is transformed by Next at build time; no font download is needed in unit tests.
vi.mock("@/lib/fonts", () => ({ fontVariables: "" }));
vi.mock("@sift/db", () => ({
  findPublishedCardsForList: vi.fn().mockResolvedValue([]),
  countPublishedCards: vi.fn().mockResolvedValue(0),
}));
vi.mock("@/components/LocaleSwitch", () => ({ LocaleSwitch: () => null }));

describe("SFT-26: reuse Sift's server-side internationalisation", () => {
  it.each(["ar", "en"] as const)("renders the /%s catalogue on the server", async (locale) => {
    const page = await HomePage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(page);
    expect(html).toContain(locale === "ar" ? "سِفت" : "Sift");
    expect(html).toContain(getTranslator(locale)("catalogue.empty"));
    expect(html).not.toContain(getTranslator(locale === "ar" ? "en" : "ar")("catalogue.empty"));
  });
  it.each(["ar", "en"] as const)("resolves /%s/... using the URL locale", async (locale) => {
    for (const path of [`/${locale}`, `/${locale}/missing-page`]) {
      // A conflicting browser preference must not override an explicit URL locale.
      const response = proxy(
        new NextRequest(`https://sift.example${path}`, {
          headers: { "Accept-Language": locale === "ar" ? "en" : "ar" },
        }),
      );
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
    const params = Promise.resolve({ locale });
    const html = renderToStaticMarkup(await LocaleLayout({ params, children: <p>Content</p> }));
    expect(html).toContain(`lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"`);
    const metadata = await generateMetadata({ params });
    expect(metadata.title).toEqual({
      default: locale === "ar" ? "سِفت" : "Sift",
      template: `%s · ${locale === "ar" ? "سِفت" : "Sift"}`,
    });
    expect(metadata.description).toBe(getTranslator(locale)("meta.description"));
  });

  it("generates only the supported locale segments and rejects an invalid server locale", async () => {
    expect(generateStaticParams()).toEqual([{ locale: "ar" }, { locale: "en" }]);
    await expect(
      LocaleLayout({ params: Promise.resolve({ locale: "fr" }), children: null }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("redirects unprefixed paths to Arabic while preserving the path and query", () => {
    const response = proxy(new NextRequest("https://sift.example/missing-page?q=card"));
    expect(response.headers.get("location")).toBe("https://sift.example/ar/missing-page?q=card");
  });

  it.each(["ar", "en"] as const)("formats the documented examples in %s", (locale) => {
    const date = formatDate("2026-10-03T09:00:00Z", locale);
    expect(date).toBe(locale === "ar" ? "3 أكتوبر 2026" : "October 3, 2026");
    expect(formatSAR(1500, locale)).toBe("1,500");
    const amount = renderToStaticMarkup(<Riyal value={1500} locale={locale} />);
    expect(amount).toContain(`aria-label="${locale === "ar" ? "ريال سعودي" : "Saudi riyal"}"`);
    expect(amount).toContain("</svg> 1,500</span>");
    expect(amount).toContain('dir="ltr"');
    const percent = formatNumber(0.155, locale, { style: "percent", maximumFractionDigits: 1 });
    // ICU versions can use either the Arabic or ASCII percent sign with latn digits.
    expect(percent).toMatch(locale === "ar" ? /^15\.5[%٪]$/ : /^15\.5%$/);
    expect(getTranslator(locale)("common.lastUpdated", { date })).toBe(
      locale === "ar" ? "آخر تحديث: 3 أكتوبر 2026" : "Last updated: October 3, 2026",
    );
  });

  it("does not silently fall back to English for a missing Arabic message", () => {
    expect(getTranslator("ar")("common.lastUpdated", { date: "2026" })).not.toContain(
      "Last updated",
    );
    expect(() => getTranslator("ar")("common.missing" as MessageKey)).toThrow(/Missing message/);
  });
});
