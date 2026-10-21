import { describe, expect, it } from "vitest";
import { DATE_LOCALE, formatDate, formatNumber, formatSAR } from "./format";

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

const ARABIC_INDIC = /[\u0660-\u0669\u06f0-\u06f9]/;

describe("formatNumber", () => {
  it("never outputs Arabic-Indic digits in Arabic", () => {
    for (const value of [0, 7, 1234567.89, -42, 0.155]) {
      const text = formatNumber(value, "ar");
      expect(text).not.toMatch(ARABIC_INDIC);
      expect(text).toMatch(/[0-9]/);
    }
  });

  it("passes options through but cannot be switched to another numbering system", () => {
    expect(formatNumber(0.155, "en", { style: "percent", maximumFractionDigits: 1 })).toBe("15.5%");
    expect(formatNumber(0.155, "ar", { style: "percent" })).not.toMatch(ARABIC_INDIC);
  });

  it("groups thousands in English (en-SA)", () => {
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
  });
});

describe("formatDate", () => {
  // 3 October 2026, 12:00 Riyadh time. In the Umm al-Qura calendar this is in 1448 AH.
  const date = new Date("2026-10-03T09:00:00Z");

  it("uses the Gregorian calendar and Western digits in Arabic", () => {
    const text = formatDate(date, "ar");
    expect(text).not.toMatch(ARABIC_INDIC);
    expect(text).toContain("2026");
    expect(text).toContain("3");
    expect(text).toContain("أكتوبر");
    expect(text).not.toMatch(/1448|هـ/);
  });

  it("uses the Gregorian calendar in English", () => {
    expect(formatDate(date, "en")).toBe("October 3, 2026");
  });

  it("reports a Gregorian calendar and latn digits for both locales", () => {
    for (const locale of ["ar", "en"] as const) {
      const resolved = new Intl.DateTimeFormat(DATE_LOCALE[locale]).resolvedOptions();
      expect(resolved.calendar).toBe("gregory");
      expect(resolved.numberingSystem).toBe("latn");
    }
  });

  it("formats in Asia/Riyadh so the day does not shift with the server timezone", () => {
    // 22:30 UTC on 2 Oct is 01:30 on 3 Oct in Riyadh.
    expect(formatDate("2026-10-02T22:30:00Z", "en")).toBe("October 3, 2026");
  });
});
