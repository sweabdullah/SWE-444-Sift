import { describe, expect, it } from "vitest";
import { CATALOGUE_PAGE_SIZE, pageHref, paginate, parsePage } from "./pagination";

const numbers = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("parsePage", () => {
  it("reads a whole page number", () => {
    expect(parsePage({ page: "3" })).toBe(3);
    expect(parsePage({ page: " 2 " })).toBe(2);
    expect(parsePage({ page: ["4", "9"] })).toBe(4);
  });

  it("falls back to page 1 for anything else", () => {
    for (const page of [undefined, "", "0", "-1", "1.5", "abc", "2e3", "99999999999999999999"]) {
      expect(parsePage({ page })).toBe(1);
    }
  });
});

describe("paginate", () => {
  it("cuts the requested page and reports its position", () => {
    const result = paginate(numbers(8), 2, 6);
    expect(result).toEqual({ items: [7, 8], page: 2, pageCount: 2, total: 8, start: 7, end: 8 });
  });

  it("shows the first page in full", () => {
    const result = paginate(numbers(8), 1, 6);
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6]);
    expect([result.start, result.end]).toEqual([1, 6]);
  });

  it("clamps a page past the end to the last page", () => {
    const result = paginate(numbers(8), 50, 6);
    expect(result.page).toBe(2);
    expect(result.items).toEqual([7, 8]);
  });

  it("treats an exact multiple as full pages, with no empty last page", () => {
    expect(paginate(numbers(12), 1, 6).pageCount).toBe(2);
  });

  it("describes an empty list as page 1 of 1 with nothing shown", () => {
    expect(paginate([], 3, 6)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      start: 0,
      end: 0,
    });
  });

  it("never returns more than one page of items", () => {
    expect(paginate(numbers(100), 1).items).toHaveLength(CATALOGUE_PAGE_SIZE);
  });

  it("rejects a page size that is not a whole number above zero", () => {
    expect(() => paginate(numbers(3), 1, 0)).toThrow();
  });
});

describe("pageHref", () => {
  it("keeps every filter, the sort and unknown parameters, and sets the page", () => {
    const href = pageHref("ar", { reward: ["cashback", "miles"], sort: "fee", q: "ساب" }, 2);
    const url = new URL(href, "https://sift.test");
    expect(url.pathname).toBe("/ar");
    expect(url.searchParams.getAll("reward")).toEqual(["cashback", "miles"]);
    expect(url.searchParams.get("sort")).toBe("fee");
    expect(url.searchParams.get("q")).toBe("ساب");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("replaces the current page rather than adding a second one", () => {
    const url = new URL(pageHref("en", { page: "2", sort: "rate" }, 3), "https://sift.test");
    expect(url.searchParams.getAll("page")).toEqual(["3"]);
  });

  it("leaves the page parameter out for page 1", () => {
    expect(pageHref("en", { page: "2", sort: "fee" }, 1)).toBe("/en?sort=fee");
    expect(pageHref("ar", { page: "2" }, 1)).toBe("/ar");
  });
});
