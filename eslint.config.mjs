// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";
import nextPlugin from "@next/eslint-plugin-next";

import {
  STYLE_FIX,
  findInClassString,
  isPhysicalStyle,
} from "./apps/web/scripts/logical-patterns.mjs";

// Arabic-first (RTL) app: physical left/right utilities and inline styles are banned in apps/web.
// Patterns are shared with apps/web/scripts/check-logical.mjs (`pnpm --filter web lint:logical`,
// run by `pnpm lint`), so the editor and the script flag the same things.

/** @type {import("eslint").Rule.RuleModule} */
const noPhysicalClasses = {
  meta: {
    type: "problem",
    messages: {
      physical: "Physical left/right utility `{{match}}`: use {{fix}}.",
      style: "Physical left/right inline style `{{match}}`: use {{fix}}.",
    },
    schema: [],
  },
  create(context) {
    /** @param {any} node @param {string} text */
    const check = (node, text) => {
      for (const f of findInClassString(text))
        context.report({ node, messageId: "physical", data: { match: f.match, fix: f.fix } });
    };
    return {
      // Every string, not only className: catches cn("ml-4"), const H = "mr-2", templates.
      /** @param {any} node */
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      /** @param {any} node */
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
      // style={{ marginLeft: 8, left: 0, textAlign: "left" }}
      /** @param {any} node */
      JSXAttribute(node) {
        if (node.name.name !== "style" || node.value?.type !== "JSXExpressionContainer") return;
        const obj = node.value.expression;
        if (obj.type !== "ObjectExpression") return;
        for (const p of obj.properties) {
          if (p.type !== "Property") continue;
          const key =
            p.key.type === "Identifier" ? p.key.name : p.key.type === "Literal" ? p.key.value : "";
          const value = p.value.type === "Literal" ? p.value.value : undefined;
          if (typeof key === "string" && isPhysicalStyle(key, value))
            context.report({ node: p, messageId: "style", data: { match: key, fix: STYLE_FIX } });
        }
      },
    };
  },
};

// One lint configuration for the whole monorepo.
export default tseslint.config(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/out/**", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // The backlog's K-3 outcome: typed code without resorting to `any`.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      eqeqeq: ["error", "always"],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      sift: { rules: { "no-physical-classes": noPhysicalClasses } },
    },
    settings: { next: { rootDir: "apps/web" } },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "sift/no-physical-classes": "error",
    },
  },
  {
    // Tests contain banned strings on purpose (same exemption as lint:logical).
    files: ["apps/web/**/*.test.{ts,tsx}"],
    rules: { "sift/no-physical-classes": "off" },
  },
  // Must stay last: turns off stylistic rules that Prettier owns.
  prettier,
);
