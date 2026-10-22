// Single source of truth for "no physical left/right" checks. Sift is Arabic-first (RTL).
// Used by BOTH scripts/check-logical.mjs (pnpm --filter web lint:logical) and the ESLint rule
// `sift/no-physical-classes` in the root eslint.config.mjs, so the two cannot drift.
//
// Known limitation (documented, not checked): asymmetric shorthands such as
// `margin: 0 0 0 8px` or `inset: 0 auto auto 0` still encode a side; review them by eye.

const VALUE = String.raw`(?:\d+(?:\.\d+)?|px|auto|full|\d+\/\d+|\[[^\]\s]+\]|\([^)\s]+\))`;
// Start of a class token: line start, whitespace, quote/backtick, brace/paren, comma, `!`
// (v3 important prefix) or `:` (after a variant like `md:`).
const START = String.raw`(?<=^|[\s"'\`{(,!:])`;
// End of a class token; `!` allows Tailwind v4's important suffix (`ml-4!`).
const END = String.raw`(?=$|[\s"'\`})\],;!])`;

const PHYSICAL_CSS_PROP = String.raw`(?:(?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right)(?:-[a-z-]+)?|left|right)`;

/** Tailwind class tokens that hard-code a physical side (code files and CSS `@apply`). */
export const CLASS_RULES = [
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
  // Arbitrary properties: [margin-left:4px], md:[left:0], [text-align:right]
  {
    re: new RegExp(
      String.raw`${START}\[(?:${PHYSICAL_CSS_PROP}:[^\]]*|(?:text-align|float|clear):(?:left|right))\]`,
      "g",
    ),
    fix: "[margin-inline-start:…], [inset-inline-start:…], or a logical utility",
  },
];

/** Physical CSS properties in stylesheets. */
export const CSS_RULES = [
  {
    re: /\b(?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right)\b/g,
    fix: "margin-inline-start/end, padding-inline-start/end, border-inline-start/end",
  },
  // `left:` / `right:` as a declaration, also inside one-line rules like `.b{left:0}`.
  { re: /(?<=^|[{;\s])(?:left|right)\s*:/gm, fix: "inset-inline-start / inset-inline-end" },
  { re: /\b(?:text-align|float|clear)\s*:\s*(?:left|right)\b/g, fix: "start / end" },
];

/** React inline-style keys (camelCase) that hard-code a physical side. */
export const PHYSICAL_STYLE_KEY =
  /^(?:(?:margin|padding|scrollMargin|scrollPadding)(?:Left|Right)|left|right|border(?:Left|Right)\w*|border(?:Top|Bottom)(?:Left|Right)Radius)$/;
/** Inline-style keys whose VALUE must not be left/right. */
export const PHYSICAL_STYLE_VALUE_KEY = /^(?:textAlign|float|clear)$/;
export const STYLE_FIX =
  "marginInlineStart/End, paddingInlineStart/End, insetInlineStart/End, borderInlineStart/End, textAlign start/end";

/** Is `{ key: value }` in a React `style` object physical? */
export function isPhysicalStyle(key, value) {
  if (PHYSICAL_STYLE_KEY.test(key)) return true;
  return (
    PHYSICAL_STYLE_VALUE_KEY.test(key) &&
    typeof value === "string" &&
    /^(?:left|right)$/.test(value.trim())
  );
}

/** Regex form of the style check for the text-based script: `marginLeft:` / `textAlign: "left"`. */
const STYLE_TEXT_RULES = [
  {
    re: /\b(?:(?:margin|padding|scrollMargin|scrollPadding)(?:Left|Right)|border(?:Left|Right)\w*|border(?:Top|Bottom)(?:Left|Right)Radius)\s*:/g,
    fix: STYLE_FIX,
  },
  { re: /\b(?:textAlign|float|clear)\s*:\s*["'`](?:left|right)["'`]/g, fix: STYLE_FIX },
];

function run(rules, text, offset, out) {
  for (const { re, fix } of rules) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re))
      out.push({ index: offset + (m.index ?? 0), match: m[0].trim(), fix });
  }
}

/** Findings for a string of Tailwind classes (used by the ESLint rule on every string). */
export function findInClassString(text) {
  const out = [];
  run(CLASS_RULES, text, 0, out);
  return out;
}

/** Findings for a whole file. `kind` is "code" or "css". Each finding: { index, match, fix }. */
export function findInSource(source, kind) {
  const out = [];
  if (kind === "css") {
    run(CSS_RULES, source, 0, out);
    // `@apply ml-4 float-left;` — Tailwind classes inside CSS.
    for (const m of source.matchAll(/@apply\s[^;}]*/g)) run(CLASS_RULES, m[0], m.index ?? 0, out);
  } else if (kind === "code") {
    run(CLASS_RULES, source, 0, out);
    run(STYLE_TEXT_RULES, source, 0, out);
    // `left:` / `right:` keys only inside a JSX style={{ … }} object (elsewhere they're too common).
    for (const m of source.matchAll(/style=\{\{([^}]*)\}\}/g)) {
      const inner = m[1] ?? "";
      const base = (m.index ?? 0) + "style={{".length;
      run([{ re: /(?<=^|[\s{,])(?:left|right)\s*:/g, fix: STYLE_FIX }], inner, base, out);
    }
  }
  return out.sort((a, b) => a.index - b.index);
}
