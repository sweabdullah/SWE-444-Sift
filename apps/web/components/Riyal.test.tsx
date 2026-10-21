import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Riyal } from "./Riyal";

describe("<Riyal>", () => {
  it("renders an LTR-isolated, non-wrapping span with the symbol before the number", () => {
    const html = renderToStaticMarkup(<Riyal value={250} locale="ar" />);
    expect(html).toMatch(/^<span dir="ltr" class="whitespace-nowrap" style="unicode-bidi:isolate"/);
    const svgAt = html.indexOf("<svg");
    const numberAt = html.indexOf("250");
    expect(svgAt).toBeGreaterThan(-1);
    expect(numberAt).toBeGreaterThan(svgAt);
    expect(html).toContain("</svg> 250</span>");
  });

  it("uses currentColor, the official viewBox, and a localised accessible label", () => {
    const ar = renderToStaticMarkup(<Riyal value={1} locale="ar" />);
    const en = renderToStaticMarkup(<Riyal value={1} locale="en" />);
    for (const html of [ar, en]) {
      expect(html).toContain('fill="currentColor"');
      expect(html).toContain('viewBox="0 0 1124.14 1256.39"');
      expect(html).toContain('role="img"');
      expect(html).not.toMatch(/SAR|ريال سعودي 1|scaleX/);
    }
    expect(ar).toContain('aria-label="ريال سعودي"');
    expect(en).toContain('aria-label="Saudi riyal"');
  });

  it("keeps Western digits and the symbol before the minus sign in Arabic", () => {
    const html = renderToStaticMarkup(<Riyal value={-1250} locale="ar" />);
    expect(html).toMatch(/<\/svg> -1[,٬]?250<\/span>$/);
    expect(html).not.toMatch(/[\u0660-\u0669]/);
  });
});
