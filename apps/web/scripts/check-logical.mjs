#!/usr/bin/env node
// Fails if any source file in apps/web uses physical left/right utilities or CSS properties.
// Sift is Arabic-first (RTL): use logical ones instead — ms-/me-, ps-/pe-, start-/end-,
// text-start/text-end, border-s/border-e, rounded-s/rounded-e, margin-inline-start, etc.
// Run: pnpm --filter web lint:logical   (also part of `pnpm lint` at the repo root)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const VALUE = String.raw`(?:\d+(?:\.\d+)?|px|auto|full|\d+\/\d+|\[[^\]\s]+\]|\([^)\s]+\))`;
const START = String.raw`(?<=^|[\s"'\`{(,!:])`; // start of a class token (after a variant colon too)
const END = String.raw`(?=$|[\s"'\`})\],;])`;

/** Tailwind class tokens that hard-code a physical side. */
const CLASS_RULES = [
  {
    re: new RegExp(`${START}-?(?:scroll-)?(?:m|p)(?:l|r)-${VALUE}${END}`, "g"),
    fix: "ms-/me-, ps-/pe-",
  },
  { re: new RegExp(`${START}-?(?:left|right)-${VALUE}${END}`, "g"), fix: "start-/end-" },
  {
    re: new RegExp(`${START}(?:text|float|clear)-(?:left|right)${END}`, "g"),
    fix: "text-start/text-end, float-start/float-end",
  },
  {
    re: new RegExp(
      String.raw`${START}(?:border|rounded)-(?:l|r|tl|tr|bl|br)(?:-[\w\[\]./#%-]+)?${END}`,
      "g",
    ),
    fix: "border-s/border-e, rounded-s/rounded-e/rounded-ss…",
  },
  { re: new RegExp(`${START}space-x-reverse${END}`, "g"), fix: "gap-* (flex/grid)" },
];

/** Physical CSS properties in stylesheets. */
const CSS_RULES = [
  {
    re: /\b(?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right)\b/g,
    fix: "margin-inline-start/end, padding-inline-start/end, border-inline-start/end",
  },
  { re: /^\s*(?:left|right)\s*:/gm, fix: "inset-inline-start / inset-inline-end" },
  { re: /\b(?:text-align|float|clear)\s*:\s*(?:left|right)\b/g, fix: "start / end" },
];

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".mdx"]);
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  "out",
  "dist",
  "coverage",
  "public",
  "scripts",
]);

/** Returns a list of `{ line, match, fix }` findings for one file's contents. */
export function findPhysical(source, ext) {
  const rules = ext === ".css" ? CSS_RULES : CODE_EXT.has(ext) ? CLASS_RULES : [];
  const findings = [];
  for (const { re, fix } of rules) {
    re.lastIndex = 0;
    for (const m of source.matchAll(re)) {
      const line = source.slice(0, m.index).split("\n").length;
      findings.push({ line, match: m[0].trim(), fix });
    }
  }
  return findings.sort((a, b) => a.line - b.line);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  let count = 0;
  for (const file of walk(root)) {
    const ext = extname(file);
    if (/\.test\.[cm]?[jt]sx?$/.test(file)) continue; // tests contain banned strings on purpose
    if (file.includes(join("app", "brand"))) continue; // verbatim brand kit copy
    for (const f of findPhysical(readFileSync(file, "utf8"), ext)) {
      count++;
      console.error(`${relative(root, file)}:${f.line}  "${f.match}"  → use ${f.fix}`);
    }
  }
  if (count > 0) {
    console.error(
      `\nlint:logical — ${count} physical left/right usage(s). Use logical properties.`,
    );
    process.exit(1);
  }
  console.log("lint:logical — no physical left/right utilities found.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
