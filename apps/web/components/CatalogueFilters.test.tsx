import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseFilters } from "@/lib/filters";
import { CatalogueFiltersForm } from "./CatalogueFilters";

describe("catalogue search form", () => {
  it.each(["en", "ar"] as const)("submits search and filters to page 1 in %s", (locale) => {
    const html = renderToStaticMarkup(
      <CatalogueFiltersForm
        locale={locale}
        filters={parseFilters({
          q: "الرِّيَاض",
          reward: "miles",
          feeMax: "500",
          income: "10000",
          sharia: "1",
          page: "3",
        })}
        sort="fee"
      />,
    );
    expect(html).toContain('method="get"');
    expect(html).toContain(`action="/${locale}"`);
    expect(html).toContain('type="search"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="الرِّيَاض"');
    expect(html).toContain('dir="auto"');
    expect(html).toContain('name="reward"');
    expect(html).toContain('name="feeMax"');
    expect(html).toContain('name="income"');
    expect(html).toContain('name="sharia"');
    expect(html).toContain('value="fee" selected=""');
    // A GET submission replaces the current query. Omitting page starts the new search at 1.
    expect(html).not.toContain('name="page"');
    expect(html).toContain(
      locale === "en" ? "Search by card or bank name" : "البحث باسم البطاقة أو البنك",
    );
  });
});
