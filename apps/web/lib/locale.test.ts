import { describe, expect, it } from "vitest";
import { localizedPath } from "./locale";

describe("localizedPath", () => {
  it("swaps only the locale segment, so the visitor stays on the same page", () => {
    expect(localizedPath("/ar", "en")).toBe("/en");
    expect(localizedPath("/ar/cards/alrajhi-signature", "en")).toBe("/en/cards/alrajhi-signature");
    expect(localizedPath("/en/compare", "ar")).toBe("/ar/compare");
  });

  it("adds a locale prefix when the path has none", () => {
    expect(localizedPath("/", "ar")).toBe("/ar");
    expect(localizedPath("/cards", "en")).toBe("/en/cards");
  });

  it("keeps the query string (with or without a leading ?)", () => {
    expect(localizedPath("/ar", "en", "?x=1")).toBe("/en?x=1");
    expect(localizedPath("/ar/cards", "en", "bank=snb&sharia=1")).toBe(
      "/en/cards?bank=snb&sharia=1",
    );
    expect(localizedPath("/en", "ar", "")).toBe("/ar");
    expect(localizedPath("/en", "ar", "?")).toBe("/ar");
  });
});
