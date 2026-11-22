import { defineConfig } from "@playwright/test";
const baseURL = process.env.SIFT_AUTH_E2E_URL ?? "http://127.0.0.1:3144";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname))
  throw new Error("Auth browser tests require localhost");
export default defineConfig({
  testDir: "./e2e/auth",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL,
    headless: true,
    viewport: { width: 390, height: 844 },
    screenshot: "only-on-failure",
  },
  reporter: "list",
});
