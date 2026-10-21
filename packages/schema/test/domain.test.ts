import { describe, expect, it } from "vitest";
import { FeesSchema, directionOf, isLocale } from "../src/index.js";

const fees = {
  annualFee: 0,
  issuanceFee: null,
  supplementaryCardFee: null,
  fxMarkupPct: 2.75,
  cashAdvanceFee: null,
  latePaymentFee: null,
  feeWaiverCondition: null,
};

describe("FeesSchema", () => {
  it("keeps null (not published) distinct from 0 (free)", () => {
    const parsed = FeesSchema.parse(fees);
    expect(parsed.annualFee).toBe(0);
    expect(parsed.issuanceFee).toBeNull();
  });

  it("requires all seven fields to be present", () => {
    const { latePaymentFee: _drop, ...six } = fees;
    expect(FeesSchema.safeParse(six).success).toBe(false);
  });
});

describe("locale helpers", () => {
  it("still work", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
    expect(isLocale("fr")).toBe(false);
  });
});
