import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@sift/db";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
const en: typeof import("../../messages/en.json") = JSON.parse(
  readFileSync(new URL("../../messages/en.json", import.meta.url), "utf8"),
);
const ar: typeof import("../../messages/ar.json") = JSON.parse(
  readFileSync(new URL("../../messages/ar.json", import.meta.url), "utf8"),
);
const databaseURL = process.env.SIFT_AUTH_TEST_DATABASE_URL;
if (
  !databaseURL ||
  !["localhost", "127.0.0.1"].includes(new URL(databaseURL).hostname) ||
  !new URL(databaseURL).pathname.endsWith("_auth_spike_test")
)
  throw new Error("Use a disposable localhost *_auth_spike_test database");
const db = new PrismaClient({ datasourceUrl: databaseURL });
const emails: string[] = [];
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 1000 },
];
function fixture(tag: string) {
  const email = `final-${tag}-${randomUUID()}@example.com`;
  emails.push(email);
  return email;
}
async function fill(page: Page, locale: "ar" | "en", email: string, password: string) {
  if (await page.evaluate(() => typeof window !== "undefined"))
    await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  const copy = locale === "ar" ? ar.auth : en.auth;
  await page.getByLabel(copy.email, { exact: true }).fill(email);
  await page.getByLabel(copy.password, { exact: true }).fill(password);
}
async function fits(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  for (const input of await page.locator('input:not([type="hidden"])').all())
    expect((await input.boundingBox())?.height).toBeGreaterThanOrEqual(44);
}
for (const locale of ["ar", "en"] as const) {
  const copy = locale === "ar" ? ar.auth : en.auth;
  for (const viewport of viewports)
    test(`complete ${locale} journey at ${viewport.name}`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath(`${locale}-${viewport.name}-catalogue.png`),
        fullPage: true,
      });
      const card = page.locator('a[href*="/cards/"]').first();
      await expect(card).toBeVisible();
      const detail = await card.getAttribute("href");
      if (!detail) throw new Error("Missing public card link");
      await card.click();
      await expect(page).toHaveURL(new RegExp(detail));
      const target = `${detail}?from=finalization&tag=a%26b&search=${encodeURIComponent(locale === "ar" ? "بنك" : "bank")}`;
      await page.goto(target);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath(`${locale}-${viewport.name}-detail.png`),
        fullPage: true,
      });
      await page.getByRole("link", { name: copy.register, exact: true }).click();
      await expect(page).toHaveURL((url) => url.searchParams.get("returnTo") === target);
      await expect(
        page.getByRole("heading", { name: copy.registerTitle, exact: true }),
      ).toBeVisible();
      await fits(page);
      await page.screenshot({
        path: info.outputPath(`${locale}-${viewport.name}-register.png`),
        fullPage: true,
      });
      const email = fixture(`${locale}-${viewport.name}`),
        password = locale === "ar" ? "نسيمبحري" : "Coastal!";
      await fill(page, locale, email, password);
      await page.getByLabel(copy.email, { exact: true }).click();
      await page.keyboard.press("Tab");
      await expect(page.getByLabel(copy.password, { exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: copy.showPassword })).toBeFocused();
      await page.keyboard.press("Space");
      await expect(page.getByLabel(copy.password, { exact: true })).toHaveAttribute("type", "text");
      await page.keyboard.press("Space");
      await expect(page.getByLabel(copy.password, { exact: true })).toHaveAttribute(
        "type",
        "password",
      );
      await page.getByRole("button", { name: copy.register, exact: true }).click();
      await expect(page).toHaveURL(`http://127.0.0.1:3144${target}`);
      expect(await (await page.request.get("/api/account")).json()).toMatchObject({
        email,
        role: "user",
      });
      await page.getByRole("link", { name: copy.account, exact: true }).click();
      await expect(page.getByRole("heading", { name: copy.account, exact: true })).toBeVisible();
      await fits(page);
      await page.screenshot({
        path: info.outputPath(`${locale}-${viewport.name}-account.png`),
        fullPage: true,
      });
      const saved = (await page.context().cookies())
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
      await page.getByRole("link", { name: copy.signOut, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: copy.logoutQuestion, exact: true }),
      ).toBeVisible();
      await fits(page);
      await page.screenshot({
        path: info.outputPath(`${locale}-${viewport.name}-logout.png`),
        fullPage: true,
      });
      await page.getByRole("link", { name: copy.cancel, exact: true }).click();
      expect((await page.request.get("/api/account")).status()).toBe(200);
      await page.getByRole("link", { name: copy.signOut, exact: true }).click();
      await page.getByRole("button", { name: copy.confirmSignOut, exact: true }).click();
      await expect(page).toHaveURL(/signedOut=1/);
      expect(
        (await page.request.get("/api/account", { headers: { cookie: saved } })).status(),
      ).toBe(401);
      await page.goto(target);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: info.outputPath(`${locale}-${viewport.name}-detail.png`),
        fullPage: true,
      });
      await page.getByRole("link", { name: copy.signIn, exact: true }).click();
      await expect(page.getByRole("heading", { name: copy.loginTitle, exact: true })).toBeVisible();
      await fits(page);
      await page.screenshot({
        path: info.outputPath(`${locale}-${viewport.name}-login.png`),
        fullPage: true,
      });
      await fill(page, locale, email, password);
      await page.getByRole("button", { name: copy.signIn, exact: true }).click();
      await expect(page).toHaveURL(`http://127.0.0.1:3144${target}`);
      expect((await page.request.get("/api/admin/access")).status()).toBe(403);
      expect(errors).toEqual([]);
    });
  test(`validation, retained fields, and stable auth navigation in ${locale}`, async ({
    page,
  }, info) => {
    const target = `/${locale}/cards/card_riyad_titanium?tag=a%26b&sort=fee`;
    await page.goto(`/${locale}/login?returnTo=${encodeURIComponent(target)}`);
    for (let index = 0; index < 12; index++) {
      await page
        .getByRole("link", { name: index % 2 ? copy.signIn : copy.register, exact: true })
        .click();
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === `/${locale}/${index % 2 ? "login" : "register"}` &&
          url.searchParams.get("returnTo") === target,
      );
      expect(page.url().length).toBeLessThan(400);
    }
    await page.getByRole("link", { name: copy.register, exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === `/${locale}/register`);
    await fill(page, locale, "bad-email", "tiny");
    await page.getByRole("button", { name: copy.register, exact: true }).click();
    await expect(page.getByLabel(copy.email, { exact: true })).toBeFocused();
    await expect(
      page.getByRole("alert").filter({ hasText: copy.errors.invalidEmail }),
    ).toBeVisible();
    await page.getByLabel(copy.email, { exact: true }).fill("user@sift.local");
    await page.getByRole("button", { name: copy.register, exact: true }).click();
    await expect(page.getByLabel(copy.password, { exact: true })).toBeFocused();
    await expect(
      page.getByRole("alert").filter({ hasText: copy.errors.passwordRule }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath(`${locale}-weak-password.png`), fullPage: true });
    await page.getByLabel(copy.password, { exact: true }).fill("password123");
    await page.getByRole("button", { name: copy.register, exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: copy.errors.commonPassword }),
    ).toBeVisible();
    await page.getByLabel(copy.password, { exact: true }).fill("River stone lantern meadow!");
    await page.getByRole("button", { name: copy.register, exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: copy.errors.duplicateEmail }),
    ).toBeVisible();
    await expect(page.getByLabel(copy.email, { exact: true })).toHaveValue("user@sift.local");
    await page.getByRole("link", { name: copy.signIn, exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === `/${locale}/login`);
    for (const email of ["user@sift.local", `missing-${randomUUID()}@example.com`]) {
      await fill(page, locale, email, "incorrect password");
      await page.getByRole("button", { name: copy.signIn, exact: true }).click();
      await expect(
        page.getByRole("alert").filter({ hasText: copy.errors.invalidCredentials }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: info.outputPath(`${locale}-wrong-credentials.png`),
      fullPage: true,
    });
    await page.getByRole("link", { name: copy.switchAria, exact: true }).click();
    await expect(page.locator('input[name="returnTo"]')).toHaveValue(
      target.replace(`/${locale}/`, locale === "ar" ? "/en/" : "/ar/"),
    );
  });
}
test("pending state prevents duplicate submission and preserves a recoverable form", async ({
  page,
}, info) => {
  let posts = 0;
  await page.route("**/en/register**", async (route) => {
    if (route.request().method() === "POST") {
      posts++;
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    await route.continue();
  });
  await page.goto("/en/register");
  await fill(page, "en", "user@sift.local", "River stone lantern meadow!");
  await page.locator("form").evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect(page.getByRole("button", { name: en.auth.registerPending })).toBeDisabled();
  await expect(page.getByLabel(en.auth.email, { exact: true })).toHaveAttribute("readonly", "");
  await page.screenshot({ path: info.outputPath("pending-registration.png"), fullPage: true });
  await expect(
    page.getByRole("alert").filter({ hasText: en.auth.errors.duplicateEmail }),
  ).toBeVisible();
  expect(posts).toBe(1);
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("user@sift.local");
  await expect(page.getByRole("button", { name: en.auth.register, exact: true })).toBeEnabled();
});
test("progressive registration works with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:3144/en/register");
    const email = fixture("nojs");
    await page.getByLabel(en.auth.email, { exact: true }).fill(email);
    await page.getByLabel(en.auth.password, { exact: true }).fill("Coastal!");
    await page.getByRole("button", { name: en.auth.register, exact: true }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
    await expect(page.locator("main")).toContainText(email);
  } finally {
    await context.close();
  }
});
test("a real expired session is denied and returns to localized account login", async ({
  page,
}) => {
  const email = fixture("expiry");
  await page.goto("/ar/register");
  await fill(page, "ar", email, "نسيمبحري");
  await page.getByRole("button", { name: ar.auth.register, exact: true }).click();
  await expect(page).toHaveURL(/\/ar\/account$/);
  await db.session.updateMany({ where: { user: { email } }, data: { expires: new Date(0) } });
  expect((await page.request.get("/api/account")).status()).toBe(401);
  await page.goto("/ar/account");
  await expect(page).toHaveURL(/\/ar\/login/);
  await expect(page.getByText(ar.auth.sessionRequired, { exact: true })).toBeVisible();
});
for (const locale of ["ar", "en"] as const) {
  const copy = locale === "ar" ? ar.auth : en.auth;
  test(`long Unicode passphrase round trip in ${locale}`, async ({ page }) => {
    const email = fixture(`long-${locale}`);
    const password =
      locale === "ar"
        ? "نسيم البحر فوق الجبال والوديان في صباح هادئ ومشرق!"
        : "A coastal lantern lights the river stone meadow at dawn with a unique long passphrase!";
    expect(Buffer.byteLength(password, "utf8")).toBeGreaterThan(72);
    await page.goto(`/${locale}/register`);
    await fill(page, locale, email, password);
    await page.getByRole("button", { name: copy.register, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/account$`));
    await page.getByRole("link", { name: copy.signOut, exact: true }).click();
    await page.getByRole("button", { name: copy.confirmSignOut, exact: true }).click();
    await expect(page).toHaveURL(/signedOut=1/);
    await fill(page, locale, email, password);
    await page.getByRole("button", { name: copy.signIn, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/account$`));
    await expect(page.locator("main:visible")).toContainText(email);
  });
  test(`unexpected action failure has safe localized retry UI in ${locale}`, async ({
    page,
  }, info) => {
    await page.goto(`/${locale}/register`);
    await fill(page, locale, "user@sift.local", "River stone lantern meadow!");
    await page.route(`**/${locale}/register**`, async (route) => {
      if (route.request().method() === "POST") await route.abort("failed");
      else await route.continue();
    });
    await page.getByRole("button", { name: copy.register, exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.pageErrorTitle })).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Failed to fetch");
    await fits(page);
    await page.screenshot({ path: info.outputPath(`${locale}-safe-retry.png`), fullPage: true });
    await page.unrouteAll();
    await page.getByRole("button", { name: copy.retry, exact: true }).click();
    await expect(page.getByRole("heading", { name: copy.registerTitle })).toBeVisible();
  });
}
