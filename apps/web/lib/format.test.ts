import { describe, expect, it } from "vitest";
import { formatSAR } from "./format";

describe("formatSAR", () => {
  it("uses Western digits in Arabic (ar-SA-u-nu-latn), not Arabic-Indic", () => {
    const text = formatSAR(1250.5, "ar");
    expect(text).toMatch(/^[0-9.,\u066b\u066c]+$/);
    expect(text).not.toMatch(/[\u0660-\u0669]/);
    expect(text.replace(/[^0-9]/g, "")).toBe("12505");
  });

  it("formats English with grouping and up to two decimals", () => {
    expect(formatSAR(1250.5, "en")).toBe("1,250.5");
    expect(formatSAR(250, "en")).toBe("250");
    expect(formatSAR(9.999, "en")).toBe("10");
  });

  it("keeps an ASCII minus and no bidi marks for negatives", () => {
    for (const locale of ["ar", "en"] as const) {
      const text = formatSAR(-250, locale);
      expect(text.startsWith("-")).toBe(true);
      expect(text).not.toMatch(/[\u200e\u200f\u061c\u2212]/);
      expect(text.replace(/[^0-9]/g, "")).toBe("250");
    }
  });
});
