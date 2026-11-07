import { renderToStaticMarkup } from "react-dom/server";
import { Prisma, type PublishedCardDetailRow } from "@sift/db";
import { describe, expect, it } from "vitest";
import { cards } from "../../../packages/db/prisma/seed-data";
import { getTranslator } from "@/lib/i18n";
import { summarizeRewardRate } from "@/lib/sort";
import { RewardTiers } from "./RewardTiers";
import { RewardRateValue } from "./RewardRateValue";

type Tier = PublishedCardDetailRow["rewardTiers"][number];
const decimal = (value: number | string) => new Prisma.Decimal(value);
const tier = (overrides: Partial<Tier> = {}): Tier => ({
  id: "base",
  rewardType: "cashback",
  spendingCategory: "general",
  rate: decimal("0.5"),
  rateUnit: "percent",
  cap: null,
  capPeriod: null,
  minSpend: null,
  translations: [],
  ...overrides,
});

for (const locale of ["ar", "en"] as const) {
  const t = getTranslator(locale);
  const render = (tiers: Tier[]) =>
    renderToStaticMarkup(<RewardTiers tiers={tiers} locale={locale} />);
  describe(`structured rewards (${locale})`, () => {
    it("shows the base, maximum, every tier and its actual unlocking condition", () => {
      const condition = locale === "ar" ? "إنفاق شهري مؤهل" : "Eligible monthly spending";
      const html = render([
        tier(),
        tier({
          id: "fuel",
          spendingCategory: "fuel",
          rate: decimal(5),
          cap: decimal(200),
          capPeriod: "monthly",
          minSpend: decimal(10000),
          translations: [{ condition }],
        }),
      ]);
      expect(html.match(/<li /g)).toHaveLength(2);
      expect(html.replace(/<[^>]*>/g, "")).toContain(
        t("catalogue.rate.upToBase", { max: "5%", base: "0.5%" }),
      );
      expect(html).toContain(t("rewardTiers.reward.cashback"));
      expect(html).toContain(t("rewardTiers.category.fuel"));
      expect(html).toContain(t("rewardTiers.period.monthly"));
      expect(html).toContain("</svg> 200</span>");
      expect(html).toContain("</svg> 10,000</span>");
      expect(html).toContain(condition);
      expect(html).not.toMatch(/[\u0660-\u0669]/);
    });
    it("does not describe a flat rate as an up-to headline", () => {
      expect(render([tier()])).not.toContain(locale === "ar" ? "حتى " : "Up to ");
      expect(render([tier()])).toContain("0.5%");
    });
    it("keeps an explicit no-rewards type without hiding a stored cap of unknown unit", () => {
      const html = render([tier({ rewardType: "none", cap: decimal(7) })]);
      expect(html).toContain(t("rewardTiers.reward.none"));
      expect(html).toContain(t("rewardTiers.capUnit.none", { amount: "7" }));
      expect(html).not.toContain("data-riyal");
    });
    it("keeps a missing general base unknown instead of using a category rate", () => {
      const html = render([tier({ spendingCategory: "dining", rate: decimal(5) })]);
      expect(html.replace(/<[^>]*>/g, "")).toContain(
        t("catalogue.rate.upToBase", { max: "5%", base: t("catalogue.notPublished") }),
      );
    });
    it("distinguishes zero cap/spend/rate from unpublished and never assumes unlimited", () => {
      const html = render([tier({ rate: decimal(0), cap: decimal(0), minSpend: decimal(0) })]);
      expect(html).toContain("0%");
      expect(html.match(/<\/svg> 0<\/span>/g)).toHaveLength(2);
      expect(html).toContain(t("catalogue.notPublished"));
      expect(html).not.toMatch(/unlimited|غير محدود/i);
      expect(render([])).toContain(t("catalogue.notPublished"));
    });
    it("renders all cap periods without dropping a cap when its period is missing", () => {
      for (const capPeriod of [
        "per_transaction",
        "monthly",
        "quarterly",
        "yearly",
        null,
      ] as const) {
        const html = render([tier({ cap: decimal("1234.56"), capPeriod })]);
        expect(html).toContain("</svg> 1,234.56</span>");
        expect(html).toContain(
          capPeriod === null ? t("catalogue.notPublished") : t(`rewardTiers.period.${capPeriod}`),
        );
      }
    });
    it("keeps points and miles separate and preserves four decimal places", () => {
      const html = render([
        tier({
          id: "points",
          rewardType: "points",
          rateUnit: "points_per_sar",
          rate: decimal("1.1234"),
          cap: decimal(200),
        }),
        tier({
          id: "miles",
          rewardType: "miles",
          rateUnit: "miles_per_sar",
          rate: decimal("0.0001"),
          cap: decimal(300),
        }),
      ]);
      expect(html).toContain(t("catalogue.rate.points_per_sar", { rate: "1.1234" }));
      expect(html).toContain(t("catalogue.rate.miles_per_sar", { rate: "0.0001" }));
      expect(html).toContain(t("rewardTiers.capUnit.points", { amount: "200" }));
      expect(html).toContain(t("rewardTiers.capUnit.miles", { amount: "300" }));
      expect(html).toContain(t("rewardTiers.sarValueUnavailable"));
      expect(html).not.toContain("data-riyal");
    });
    it("shows missing/blank conditions honestly and escapes stored markup", () => {
      for (const translations of [[], [{ condition: " " }]]) {
        expect(render([tier({ translations })])).toContain(t("catalogue.notPublished"));
      }
      const html = render([tier({ translations: [{ condition: "<script>alert(1)</script>" }] })]);
      expect(html).toContain("&lt;script&gt;");
      expect(html).not.toContain("<script>");
    });
    it("renders the real seeded tiers in their stored order and selected locale", () => {
      for (const card of cards) {
        const tiers = card.tiers.map((row, index) =>
          tier({
            ...row,
            id: String(index),
            rate: decimal(row.rate),
            cap: row.cap === null ? null : decimal(row.cap),
            minSpend: row.minSpend === null ? null : decimal(row.minSpend),
            translations: [{ condition: row.condition[locale] }],
          }),
        );
        const html = render(tiers);
        let previous = -1;
        for (const row of tiers) {
          const condition = row.translations[0]?.condition ?? "";
          // Escape prose exactly as React does, then ensure none of the published tiers vanish.
          const escaped = renderToStaticMarkup(<span>{condition}</span>).slice(6, -7);
          const position = html.indexOf(escaped, previous + 1);
          expect(position).toBeGreaterThan(previous);
          previous = position;
        }
      }
    });
    it("uses the same summary for catalogue and detail rendering", () => {
      const summary = summarizeRewardRate([
        { spendingCategory: "general", rate: 0.5, rateUnit: "percent", minSpend: null },
        { spendingCategory: "fuel", rate: 5, rateUnit: "percent", minSpend: 5000 },
      ]);
      if (!summary) throw new Error("Expected summary");
      expect(
        render([
          tier(),
          tier({ id: "fuel", spendingCategory: "fuel", rate: decimal(5), minSpend: decimal(5000) }),
        ]),
      ).toContain(renderToStaticMarkup(<RewardRateValue t={t} locale={locale} rate={summary} />));
    });
  });
}
