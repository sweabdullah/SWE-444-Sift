import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for apps/web only. Repo-wide test running and CI arrive with SFT-76 / SFT-8.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx,mjs}"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
