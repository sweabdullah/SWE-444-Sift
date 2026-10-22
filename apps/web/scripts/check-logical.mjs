#!/usr/bin/env node
// Fails if any source file in apps/web uses physical left/right utilities or CSS properties.
// Sift is Arabic-first (RTL): use logical ones instead — ms-/me-, ps-/pe-, start-/end-,
// text-start/text-end, border-s/border-e, rounded-s/rounded-e, margin-inline-start, etc.
// Patterns live in ./logical-patterns.mjs, shared with the ESLint rule `sift/no-physical-classes`.
// Run: pnpm --filter web lint:logical   (also part of `pnpm lint` at the repo root)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { findInSource } from "./logical-patterns.mjs";

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
  const kind = ext === ".css" ? "css" : CODE_EXT.has(ext) ? "code" : null;
  if (!kind) return [];
  return findInSource(source, kind).map(({ index, match, fix }) => ({
    line: source.slice(0, index).split("\n").length,
    match,
    fix,
  }));
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
