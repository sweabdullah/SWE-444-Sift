// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";
import nextPlugin from "@next/eslint-plugin-next";

// Arabic-first (RTL) app: physical left/right Tailwind utilities are banned in className.
// Editor-time mirror of apps/web/scripts/check-logical.mjs, which is the authoritative check
// (`pnpm --filter web lint:logical`, run by `pnpm lint`).
const PHYSICAL_CLASS =
  /(?:^|\s|:)(?:-?(?:scroll-)?[mp][lr]-|-?(?:left|right)-(?=\d|px|auto|full|\[)|(?:text|float|clear)-(?:left|right)(?:\s|$)|(?:border|rounded)-(?:l|r|tl|tr|bl|br)(?:-|\s|$))/;

/** @type {import("eslint").Rule.RuleModule} */
const noPhysicalClasses = {
  meta: {
    type: "problem",
    messages: {
      physical:
        "Use logical utilities (ms-/me-, ps-/pe-, start-/end-, text-start/text-end, border-s/-e, rounded-s/-e), never left/right.",
    },
    schema: [],
  },
  create(context) {
    /** @param {import("estree").Node} node @param {string} text */
    const check = (node, text) => {
      if (PHYSICAL_CLASS.test(text)) context.report({ node, messageId: "physical" });
    };
    return {
      /** @param {any} node */
      JSXAttribute(node) {
        if (node.name.name !== "className" || !node.value) return;
        const v = node.value;
        if (v.type === "Literal" && typeof v.value === "string") check(v, v.value);
        if (v.type === "JSXExpressionContainer") {
          const e = v.expression;
          if (e.type === "Literal" && typeof e.value === "string") check(e, e.value);
          if (e.type === "TemplateLiteral")
            for (const q of e.quasis) check(q, q.value.cooked ?? q.value.raw);
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
  // Must stay last: turns off stylistic rules that Prettier owns.
  prettier,
);
