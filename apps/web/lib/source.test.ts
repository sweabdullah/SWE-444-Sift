import { describe, expect, it } from "vitest";
import {
  httpSourceHost,
  isOfficialSourceUrl,
  normalizeSourceUrl,
} from "../../../packages/schema/src/source";
import { officialSourceCases, sourceUrlCases } from "../../../packages/schema/test/source-cases";
import { banks, cards, sources } from "../../../packages/db/prisma/seed-data";

describe("official HTTP(S) source contract", () => {
  for (const [url, host] of sourceUrlCases) {
    it(`parses or rejects ${JSON.stringify(url)}`, () => {
      expect(httpSourceHost(url)).toBe(host);
    });
  }
  for (const [url, registered, official] of officialSourceCases) {
    it(`checks ${url} against the registered bank ${registered}`, () => {
      expect(isOfficialSourceUrl(url, registered)).toBe(official);
    });
  }
  it("normalizes Arabic paths using the browser parser", () => {
    const normalized = normalizeSourceUrl("HTTPS://BANK.EXAMPLE:443/بطاقة");
    expect(normalized).toBe("https://bank.example/%D8%A8%D8%B7%D8%A7%D9%82%D8%A9");
    expect(() => new URL(normalized ?? "")).not.toThrow();
  });
  it("does not derive trust from a widened display homepage", () => {
    expect(isOfficialSourceUrl("https://evil.com/cards", ["https://www.sab.com/"])).toBe(false);
  });
  it("accepts every existing bank/source and keeps each card's source on its own bank", () => {
    for (const source of sources) {
      const bank = banks.find((b) => b.id === source.bankId);
      expect(bank).toBeDefined();
      expect(isOfficialSourceUrl(source.url, bank?.entryUrls ?? [])).toBe(true);
    }
    for (const card of cards) {
      const source = sources.find((s) => s.id === card.sourceId);
      expect(source?.bankId).toBe(card.bankId);
    }
  });
});
