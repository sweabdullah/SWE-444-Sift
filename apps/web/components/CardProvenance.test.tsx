import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getTranslator } from "@/lib/i18n";
import { CardProvenance } from "./CardProvenance";

describe("published card provenance", () => {
  for (const locale of ["ar", "en"] as const) {
    const t = getTranslator(locale);
    const props = {
      sourceUrl: "https://bank.example/cards/one?lang=en&section=fees",
      registeredSiteUrls: ["https://bank.example/"],
      locale,
    };
    it(`renders the actual official URL and stored verification time in ${locale}`, () => {
      const html = renderToStaticMarkup(
        <CardProvenance {...props} verifiedAt={new Date("2026-10-02T22:30:00Z")} />,
      );
      expect(html).toContain(t("provenance.source"));
      expect(html).toContain(t("provenance.verified"));
      expect(html).toContain('href="https://bank.example/cards/one?lang=en&amp;section=fees"');
      expect(html).toContain('<bdi dir="ltr">');
      expect(html).toMatch(/datetime="2026-10-02T22:30:00.000Z"/i);
      expect(html).toContain(locale === "ar" ? "3 أكتوبر 2026" : "October 3, 2026");
      expect(html).not.toMatch(/[\u0660-\u0669]/);
    });
    for (const verifiedAt of [null, new Date("invalid")]) {
      it(`does not invent a missing/invalid verification date in ${locale}`, () => {
        const html = renderToStaticMarkup(<CardProvenance {...props} verifiedAt={verifiedAt} />);
        expect(html).toContain(t("provenance.dateUnavailable"));
        expect(html).not.toContain("<time");
      });
    }
    it(`renders a usable encoded Arabic source link in ${locale}`, () => {
      const html = renderToStaticMarkup(
        <CardProvenance {...props} sourceUrl="https://bank.example/بطاقة" verifiedAt={null} />,
      );
      expect(html).toContain('href="https://bank.example/%D8%A8%D8%B7%D8%A7%D9%82%D8%A9"');
    });
    for (const sourceUrl of [
      "",
      "javascript:alert(1)",
      "https://evil.example/cards",
      "https://xn--a.bank.example/cards",
      "https://www.bank.example/cards",
    ]) {
      it(`does not emit an unsafe/off-domain link (${sourceUrl}) in ${locale}`, () => {
        const html = renderToStaticMarkup(
          <CardProvenance {...props} sourceUrl={sourceUrl} verifiedAt={null} />,
        );
        expect(html).toContain(t("provenance.sourceUnavailable"));
        expect(html).not.toContain("<a");
      });
    }
  }
});
