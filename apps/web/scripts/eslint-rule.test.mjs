import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

// Runs the real root eslint.config.mjs against virtual files in apps/web, so the
// `sift/no-physical-classes` rule is tested exactly as `pnpm lint` runs it.
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const eslint = new ESLint({ cwd: repoRoot });

async function siftErrors(code) {
  const [result] = await eslint.lintText(code, { filePath: "apps/web/components/Probe.tsx" });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === "sift/no-physical-classes")
    .map((m) => m.message);
}

describe("ESLint sift/no-physical-classes", () => {
  it("flags physical classes in className, cn() calls and constants", async () => {
    const errors = await siftErrors(
      [
        `const H = "mr-2";`,
        `declare function cn(...c: string[]): string;`,
        `export function A() {`,
        `  return <div className={cn(H, "ml-4")}><p className="ml-4! [left:0]">x</p></div>;`,
        `}`,
      ].join("\n"),
    );
    expect(errors.join("\n")).toMatch(/`mr-2`/);
    expect(errors.join("\n")).toMatch(/`ml-4`/);
    expect(errors.join("\n")).toMatch(/`\[left:0\]`/);
    expect(errors).toHaveLength(4);
  }, 30_000);

  it("flags physical keys/values in the JSX style attribute", async () => {
    const errors = await siftErrors(
      `export function B() {\n  return <div style={{ marginLeft: 8, right: 0, textAlign: "left", borderRightColor: "red", float: "start" as never }} />;\n}`,
    );
    expect(errors).toHaveLength(4);
    expect(errors.join("\n")).toMatch(
      /marginLeft.*\n.*right.*\n.*textAlign.*\n.*borderRightColor/s,
    );
  }, 30_000);

  it("allows logical classes and styles", async () => {
    const errors = await siftErrors(
      `export function C() {\n  return <div className="ms-2 pe-4 text-start start-0" style={{ marginInlineStart: 8, insetInlineEnd: 0, textAlign: "end" }} />;\n}`,
    );
    expect(errors).toEqual([]);
  }, 30_000);
});
