import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countPublishedCards,
  findPublishedCardsForList,
  type Prisma,
  type PublishedCardRow,
} from "@sift/db";
import HomePage from "./page";
import { getTranslator } from "@/lib/i18n";
import { CATALOGUE_PAGE_SIZE, pageHref } from "@/lib/pagination";

const decimal = (value: number) => ({ toString: () => String(value) }) as Prisma.Decimal;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(countPublishedCards).mockResolvedValue(0);
});

vi.mock("@sift/db", () => ({ findPublishedCardsForList: vi.fn(), countPublishedCards: vi.fn() }));
vi.mock("@/components/LocaleSwitch", () => ({ LocaleSwitch: () => null }));

describe("catalogue to detail navigation", () => {
  for (const locale of ["ar", "en"] as const) {
    it(`links each card name to its stable detail URL in ${locale}`, async () => {
      vi.mocked(findPublishedCardsForList).mockResolvedValue([
        {
          id: "card_test",
          rewardType: "cashback",
          bank: { nameAr: "بنك", nameEn: "Bank" },
          fee: null,
          translations: [{ name: locale === "ar" ? "بطاقة" : "Card" }],
          rewardTiers: [],
        },
      ]);
      const html = renderToStaticMarkup(
        await HomePage({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) }),
      );
      expect(html).toContain(`href="/${locale}/cards/card_test"`);
      expect(html).toContain(locale === "ar" ? "بطاقة</a>" : "Card</a>");
    });

    for (const page of [1, 2]) {
      it(`preserves paginated detail links, active filters and isolated rates on page ${page} in ${locale}`, async () => {
        const t = getTranslator(locale);
        const rows: PublishedCardRow[] = Array.from({ length: 8 }, (_, index) => ({
          id: `card_${index + 1}`,
          rewardType: "cashback",
          bank: { nameAr: "بنك", nameEn: "Bank" },
          translations: [{ name: (locale === "ar" ? "بطاقة " : "Card ") + (index + 1) }],
          fee: { annualFee: decimal((index + 1) * 10) },
          rewardTiers: [
            {
              rewardType: "cashback",
              spendingCategory: "general",
              rate: decimal(0.7),
              rateUnit: "percent",
              minSpend: null,
            },
            {
              rewardType: "cashback",
              spendingCategory: "fuel",
              rate: decimal(11),
              rateUnit: "percent",
              minSpend: null,
            },
          ],
        }));
        vi.mocked(findPublishedCardsForList).mockResolvedValue(rows);
        vi.mocked(countPublishedCards).mockResolvedValue(1);
        const query = {
          page: String(page),
          sort: "fee",
          reward: "cashback",
          feeMax: "1000",
          income: "5000",
          sharia: "1",
        };
        const html = renderToStaticMarkup(
          await HomePage({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve(query),
          }),
        );
        expect(findPublishedCardsForList).toHaveBeenCalledWith(locale, {
          AND: [
            {
              OR: [
                { rewardType: { in: ["cashback"] } },
                { rewardTiers: { some: { rewardType: { in: ["cashback"] } } } },
              ],
            },
            { fee: { is: { annualFee: { lte: 1000 } } } },
            { minMonthlyIncome: { lte: 5000 } },
            { shariaCompliant: true },
          ],
        });
        for (let index = 0; index < rows.length; index++) {
          const expected = page === 1 ? index < CATALOGUE_PAGE_SIZE : index >= CATALOGUE_PAGE_SIZE;
          expect(html.includes(`href="/${locale}/cards/${rows[index]?.id}"`)).toBe(expected);
        }
        expect(html.match(/<li /g)).toHaveLength(page === 1 ? 6 : 2);
        expect(html).toContain(t("catalogue.filters.matchCount", { count: 8 }));
        const otherPage = page === 1 ? 2 : 1;
        expect(html).toContain(
          `href="${pageHref(locale, query, otherPage).replaceAll("&", "&amp;")}"`,
        );
        expect(html).toContain("rtl:-scale-x-100");
        expect(html).toContain('<bdi class="whitespace-nowrap">11%</bdi>');
        expect(html).toContain('<bdi class="whitespace-nowrap">0.7%</bdi>');
        expect(html).toContain(t("catalogue.rewardType.cashback"));
        for (const key of ["unknownFee", "unknownIncome", "unknownSharia"] as const) {
          expect(html).toContain(t(`catalogue.filters.${key}`, { count: 1 }));
        }
        const form = html.split("<form")[1]?.split("</form>")[0] ?? "";
        expect(form).not.toContain('name="page"');
        expect(html).not.toMatch(/[\u0660-\u0669]/);
      });
    }
  }
});
