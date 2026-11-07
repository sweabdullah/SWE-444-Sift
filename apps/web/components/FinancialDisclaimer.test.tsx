import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LocaleLayout from "@/app/[locale]/layout";
import { FinancialDisclaimer } from "@/components/FinancialDisclaimer";
import { SiteFooter } from "@/components/SiteFooter";

vi.mock("@/lib/fonts", () => ({ fontVariables: "" }));

const copy = {
  en: {
    title: "This is not financial advice.",
    body: "Sift provides information only. Verify figures and terms directly with the bank before applying.",
  },
  ar: {
    title: "المحتوى ليس نصيحة مالية.",
    body: "سِفت دليل للمعلومات فقط. تحقّق من الأرقام والشروط لدى البنك مباشرةً قبل التقدّم بطلب البطاقة.",
  },
};

describe.each(["ar", "en"] as const)("financial disclaimer in %s", (locale) => {
  it("renders the full notice in the selected language and direction", () => {
    const html = renderToStaticMarkup(<FinancialDisclaimer locale={locale} />);
    expect(html).toContain(`lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"`);
    expect(html).toContain(`<strong class="font-semibold">${copy[locale].title}</strong>`);
    expect(html).toContain(copy[locale].body);
    expect(html).not.toContain(copy[locale === "ar" ? "en" : "ar"].title);
  });

  it("places the full notice inside the shared footer", () => {
    const html = renderToStaticMarkup(<SiteFooter locale={locale} />);
    expect(html).toMatch(/^<footer\b[\s\S]*<\/footer>$/);
    expect(html).toContain(copy[locale].title);
    expect(html).toContain(copy[locale].body);
  });

  it("includes the footer once after arbitrary page content in the root locale layout", async () => {
    const html = renderToStaticMarkup(
      await LocaleLayout({
        params: Promise.resolve({ locale }),
        children: <main>Page content</main>,
      }),
    );
    expect(html).toContain(`lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}"`);
    expect(html).toContain("<main>Page content</main><footer");
    expect(html.split(copy[locale].title)).toHaveLength(2);
    expect(html).toContain(copy[locale].body);
  });
});
