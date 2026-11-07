import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getTranslator } from "@/lib/i18n";
import { fillTemplate } from "@/lib/template";
import { RewardRateValue } from "./RewardRateValue";

describe("fillTemplate", () => {
  it("puts nodes where the placeholders are and keeps the text around them", () => {
    const html = renderToStaticMarkup(
      <p>{fillTemplate("Up to {max} · Base {base}", { max: <b>2%</b>, base: <i>1%</i> })}</p>,
    );
    expect(html).toBe("<p>Up to <b>2%</b> · Base <i>1%</i></p>");
  });

  it("leaves a placeholder with no node visible", () => {
    expect(renderToStaticMarkup(<p>{fillTemplate("{a} and {b}", { a: "x" })}</p>)).toBe(
      "<p>x and {b}</p>",
    );
  });
});

describe("<RewardRateValue>", () => {
  it("isolates each rate in a non-wrapping <bdi> in Arabic", () => {
    const html = renderToStaticMarkup(
      <RewardRateValue
        t={getTranslator("ar")}
        locale="ar"
        rate={{ unit: "percent", max: 11, base: 0.7 }}
      />,
    );
    expect(html).toBe(
      'حتى <bdi class="whitespace-nowrap">11%</bdi> · الأساسية <bdi class="whitespace-nowrap">0.7%</bdi>',
    );
  });

  it("keeps the Arabic unit words inside the isolated figure, with no forced direction", () => {
    const html = renderToStaticMarkup(
      <RewardRateValue
        t={getTranslator("ar")}
        locale="ar"
        rate={{ unit: "miles_per_sar", max: 0.33, base: 0.33 }}
      />,
    );
    expect(html).toContain('<bdi class="whitespace-nowrap">0.33 ميل / ريال</bdi>');
    expect(html).not.toContain('dir="ltr"');
  });

  it("reads the same way in English", () => {
    const html = renderToStaticMarkup(
      <RewardRateValue
        t={getTranslator("en")}
        locale="en"
        rate={{ unit: "percent", max: 2, base: 0.5 }}
      />,
    );
    expect(html).toBe(
      'Up to <bdi class="whitespace-nowrap">2%</bdi> · Base <bdi class="whitespace-nowrap">0.5%</bdi>',
    );
  });
});
