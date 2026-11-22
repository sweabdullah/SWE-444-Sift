import { describe, expect, it } from "vitest";
import { hash as bcryptHash } from "bcryptjs";
import { hashPassword, verifyPassword } from "./password";
import { passwordIssue } from "./policy";

describe("eight-character Unicode password policy", () => {
  it.each(["Coastal!", "نسيمبحري", "☀🌊🌙🌿⭐🌴🍃🪨", "river dune ".repeat(10)])(
    "accepts a diverse password/passphrase without composition rules: %s",
    (password) => {
      expect(passwordIssue(password)).toBeNull();
    },
  );
  it.each([
    "password",
    "PASSWORD123",
    "12345678",
    "كلمة المرور",
    "aaaaaaaa",
    "abcabcabc",
    "sift-dev-password",
    "correct horse battery staple",
  ])("rejects feasible common/repeated values: %s", (password) => {
    expect(passwordIssue(password)).toBe("commonPassword");
  });
  it("counts code points, rejects short/invalid Unicode, and bounds long inputs", () => {
    expect(passwordIssue("🌙🌊🌿⭐🌴🍃🪨")).toBe("passwordRule");
    expect(passwordIssue("tiny")).toBe("passwordRule");
    expect(passwordIssue("x".repeat(129))).toBe("passwordTooLong");
    expect(passwordIssue("hello" + String.fromCharCode(0xd800) + "world")).toBe("passwordRule");
  });
});
describe("versioned password hashes", () => {
  it("uses unique random salts, authenticates exact eight-character input, and rejects wrong input", async () => {
    const a = await hashPassword("Coastal!"),
      b = await hashPassword("Coastal!");
    expect(a).toMatch(/^\$sift\$scrypt\$v1\$32768\$8\$3\$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword("Coastal!", a)).toBe(true);
    expect(await verifyPassword("coastal!", a)).toBe(false);
  });
  it("accepts Arabic and passphrases beyond bcrypt's byte limit without suffix collisions", async () => {
    for (const password of ["نسيم البحر فوق الجبال ".repeat(4), "river dune ".repeat(10)]) {
      const stored = await hashPassword(password);
      expect(Buffer.byteLength(password, "utf8")).toBeGreaterThan(72);
      expect(await verifyPassword(password, stored)).toBe(true);
      expect(await verifyPassword(password.slice(0, -1) + "!", stored)).toBe(false);
    }
  });
  it("keeps legacy bcrypt accounts readable and rejects byte-truncation aliases", async () => {
    const stored = await bcryptHash("sift-dev-password", 10);
    expect(await verifyPassword("sift-dev-password", stored)).toBe(true);
    const long = "legacy password ".repeat(6);
    const truncated = await bcryptHash(long, 10);
    expect(await verifyPassword(long, truncated)).toBe(false);
  });
  it("never normalizes or trims a password during hashing", async () => {
    const value = "  summer river  ";
    const stored = await hashPassword(value);
    expect(await verifyPassword(value, stored)).toBe(true);
    expect(await verifyPassword(value.trim(), stored)).toBe(false);
  });
  it("fails closed on malformed hashes, unapproved costs, missing accounts, and impossible inputs", async () => {
    for (const stored of [
      null,
      "plaintext",
      "$sift$scrypt$v1$1048576$8$3$bad$bad",
      "$sift$scrypt$v1$32768$8$3$bad$bad",
    ])
      expect(await verifyPassword("Coastal!", stored)).toBe(false);
    expect(await verifyPassword("", null)).toBe(false);
  });
  it("bounds concurrent expensive hashing work and rejects excess queued requests", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => hashPassword("Coastal!")),
    );
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(2);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(18);
  }, 30000);
});
