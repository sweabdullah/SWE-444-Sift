import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, count } = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));
vi.mock("../../../packages/db/src/client.js", () => ({
  prisma: { card: { findMany, count } },
}));
import {
  countPublishedCards,
  findPublishedCardNames,
  findPublishedCardsForList,
} from "../../../packages/db/src/catalogue";

describe("published catalogue search queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only reads published card names and includes both languages for matching", async () => {
    findMany.mockResolvedValue([]);
    await findPublishedCardNames();
    expect(findMany).toHaveBeenCalledWith({
      where: { status: "published" },
      select: {
        id: true,
        bank: { select: { nameAr: true, nameEn: true } },
        translations: { select: { name: true } },
      },
    });
  });

  it.each(["en", "ar"] as const)(
    "enforces published status on %s results and counts even with search",
    async (locale) => {
      const where = { id: { in: ["matched"] } };
      findMany.mockResolvedValue([]);
      count.mockResolvedValue(0);
      await findPublishedCardsForList(locale, where);
      await countPublishedCards(where);
      const publishedWhere = { AND: [{ status: "published" }, where] };
      expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: publishedWhere }));
      expect(count).toHaveBeenCalledWith({ where: publishedWhere });
      // Search can match either translation, while the returned name stays in the UI language.
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            translations: { where: { locale }, select: { name: true } },
          }),
        }),
      );
    },
  );
});
