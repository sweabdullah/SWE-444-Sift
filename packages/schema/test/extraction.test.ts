import { describe, expect, it } from "vitest";
import { ExtractedCardSchema, extractedCardJsonSchema } from "../src/index.js";
import { validExtraction } from "./fixtures.js";

describe("ExtractedCardSchema", () => {
  it("accepts a valid extraction and keeps null distinct from 0", () => {
    const parsed = ExtractedCardSchema.parse(validExtraction());
    expect(parsed.fees.annualFee.value).toBe(0);
    expect(parsed.fees.issuanceFee.value).toBeNull();
  });

  it("is strict: unknown keys are rejected", () => {
    const bad = { ...validExtraction(), score: 9 };
    expect(ExtractedCardSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a missing key instead of treating it as null", () => {
    const { fees, ...rest } = validExtraction();
    const { annualFee: _drop, ...feesWithout } = fees;
    expect(ExtractedCardSchema.safeParse({ ...rest, fees: feesWithout }).success).toBe(false);
  });

  it("rejects an unparseable rate rather than coercing it to 0", () => {
    const card = validExtraction();
    const tiers = card.rewardTiers.map((t) => ({ ...t, rate: "five percent" }));
    expect(ExtractedCardSchema.safeParse({ ...card, rewardTiers: tiers }).success).toBe(false);
    const nan = card.rewardTiers.map((t) => ({ ...t, rate: Number.NaN }));
    expect(ExtractedCardSchema.safeParse({ ...card, rewardTiers: nan }).success).toBe(false);
  });

  it("requires a source URL for every published figure", () => {
    const card = validExtraction();
    card.fees.issuanceFee = { value: 100, sourceUrl: null };
    const result = ExtractedCardSchema.safeParse(card);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["fees", "issuanceFee", "sourceUrl"]);
  });

  it("rejects negative fees and non-http source URLs", () => {
    const card = validExtraction();
    card.fees.annualFee = { value: -1, sourceUrl: "https://bank.example" };
    expect(ExtractedCardSchema.safeParse(card).success).toBe(false);
    const card2 = validExtraction();
    card2.fees.annualFee = { value: 1, sourceUrl: "javascript:alert(1)" };
    expect(ExtractedCardSchema.safeParse(card2).success).toBe(false);
  });

  it("exports a JSON Schema for the model's structured output", () => {
    const schema = extractedCardJsonSchema() as {
      additionalProperties?: boolean;
      required?: string[];
    };
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain("fees");
    expect(schema.required).toContain("rewardTiers");
  });
});
