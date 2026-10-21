import type { ExtractedCard } from "../src/index.js";

const PAGE = "https://bank.example/cards/platinum";
const none = { value: null, sourceUrl: null };

/** A valid extraction of an English page: Arabic slots stay null (nothing translated). */
export function validExtraction(): ExtractedCard {
  return {
    language: "en",
    canonicalUrl: PAGE,
    extractedAt: "2026-10-21T10:00:00Z",
    name: { value: { ar: null, en: "Platinum Cashback" }, sourceUrl: PAGE },
    bankName: { value: { ar: null, en: "Example Bank" }, sourceUrl: PAGE },
    rewardType: { value: "cashback", sourceUrl: PAGE },
    network: { value: "visa", sourceUrl: PAGE },
    shariaCompliant: none,
    minMonthlyIncome: { value: 10000, sourceUrl: PAGE },
    fees: {
      annualFee: { value: 0, sourceUrl: PAGE },
      issuanceFee: none,
      supplementaryCardFee: none,
      fxMarkupPct: { value: 2.75, sourceUrl: "https://bank.example/fees.pdf" },
      cashAdvanceFee: none,
      latePaymentFee: none,
      feeWaiverCondition: none,
    },
    benefitsDescription: none,
    rewardConditions: none,
    eligibility: none,
    rewardTiers: [
      {
        rewardType: "cashback",
        spendingCategory: "dining",
        rate: 5,
        rateUnit: "percent",
        cap: 200,
        capPeriod: "monthly",
        minSpend: null,
        condition: { ar: null, en: "Up to SAR 200 a month" },
        sourceUrl: PAGE,
      },
    ],
  };
}
