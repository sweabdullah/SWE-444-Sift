import { describe, expect, it } from "vitest";
import { authHref, safeReturnTo } from "./return-to";
describe("canonical authentication destinations", () => {
  const target = "/ar/cards/card_riyad_titanium?search=%D8%A8%D9%86%D9%83&sort=fee&tag=a%26b#fees";
  it("unwraps nested auth navigation and repeated whole-value encodings", () => {
    let value = target;
    for (const page of ["login", "register", "logout", "login"])
      value = `/ar/${page}?returnTo=${encodeURIComponent(value)}`;
    expect(safeReturnTo(value, "en")).toBe(target.replace("/ar/", "/en/"));
    expect(safeReturnTo(encodeURIComponent(encodeURIComponent(target)), "ar")).toBe(target);
  });
  it("keeps repeated login/register links stable without recursive query growth", () => {
    let value = target;
    for (let step = 0; step < 100; step++) {
      value = authHref(step % 2 ? "login" : "register", value, "ar");
      expect(value.length).toBeLessThan(300);
      expect(safeReturnTo(value, "ar")).toBe(target);
      expect(new URL(value, "https://sift.invalid").searchParams.get("returnTo")).toBe(target);
    }
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "%252F%252Fevil.example",
    "/ar/login?returnTo=https%3A%2F%2Fevil.example",
    "/ar/%255clogin",
    "/ar/cards/%250aevil",
    "/ar/login?returnTo=%",
    "/ar/login?returnTo=%2Fapi%2Fauth",
    "/ar/login?returnTo=%2F%2Fevil.example",
    "/ar/cards/" + "x".repeat(4097),
  ])("rejects unsafe/malformed wrapped destinations %s", (value) => {
    expect(safeReturnTo(value, "ar")).toBe("/ar/account");
  });
  it("bounds pathological nesting", () => {
    let value = target;
    for (let index = 0; index < 10; index++)
      value = `/ar/login?returnTo=${encodeURIComponent(value)}`;
    expect(safeReturnTo(value, "ar")).toBe("/ar/account");
  });
});
