import { test, expect, chromium } from "@playwright/test";
import { PrismaClient } from "@sift/db";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
const url = process.env.SIFT_AUTH_TEST_DATABASE_URL;
if (
  !url ||
  !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_auth_spike_test")
)
  throw new Error("Use a disposable localhost *_auth_spike_test database");
const db = new PrismaClient({ datasourceUrl: url });
const createdEmails: string[] = [];
const password = "River stone lantern meadow!";
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: createdEmails } } });
  await db.$disconnect();
});
for (const locale of ["ar", "en"]) {
  test(`registers and signs out with a localized phone layout in ${locale}`, async ({
    page,
  }, info) => {
    const email = `browser-${randomUUID()}@example.com`;
    createdEmails.push(email);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/${locale}/register`);
    await page
      .getByLabel(locale === "ar" ? "البريد الإلكتروني" : "Email", { exact: true })
      .fill(email);
    await page
      .getByLabel(locale === "ar" ? "كلمة المرور" : "Password", { exact: true })
      .fill(password);
    await page
      .getByRole("button", {
        name: locale === "ar" ? "إنشاء الحساب" : "Create account",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/account$`));
    await expect(page.locator("main")).toContainText(email);
    expect(
      await db.user.findUnique({
        where: { email },
        select: { role: true, emailVerified: true, digestOptIn: true },
      }),
    ).toEqual({ role: "user", emailVerified: null, digestOptIn: false });
    expect(await page.locator("html").getAttribute("dir")).toBe(locale === "ar" ? "rtl" : "ltr");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`${locale}-account.png`), fullPage: true });
    const saved = (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
    await page
      .getByRole("link", { name: locale === "ar" ? "تسجيل الخروج" : "Sign out", exact: true })
      .click();
    expect(await db.session.count({ where: { user: { email } } })).toBe(1); // GET confirmation never revokes.
    await page
      .getByRole("button", {
        name: locale === "ar" ? "تأكيد تسجيل الخروج" : "Confirm sign out",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/signedOut=1/);
    expect(await db.session.count({ where: { user: { email } } })).toBe(0);
    const replay = await page.request.get("/api/auth/session", { headers: { cookie: saved } });
    expect(await replay.json()).toBeNull();
    expect(errors).toEqual([]);
    await page.goto(`/${locale}/register`);
    await page
      .getByLabel(locale === "ar" ? "البريد الإلكتروني" : "Email", { exact: true })
      .fill(email);
    await page
      .getByLabel(locale === "ar" ? "كلمة المرور" : "Password", { exact: true })
      .fill(password);
    await page
      .getByRole("button", {
        name: locale === "ar" ? "إنشاء الحساب" : "Create account",
        exact: true,
      })
      .click();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      locale === "ar" ? "مسجل بالفعل" : "already registered",
    );
  });
}
test("survives an actual Chromium restart and returns to the originating detail page", async ({
  baseURL,
}, info) => {
  const profile = info.outputPath("persistent-profile");
  await mkdir(profile, { recursive: true });
  const email = `restart-${randomUUID()}@example.com`;
  createdEmails.push(email);
  let context = await chromium.launchPersistentContext(profile, { headless: true, baseURL });
  try {
    let page = context.pages()[0] ?? (await context.newPage());
    await page.goto("/en/register");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
    expect(
      (await context.cookies()).some(
        (c) => c.name === "sift.session-token" && c.expires > Date.now() / 1000,
      ),
    ).toBe(true);
    await context.close();
    context = await chromium.launchPersistentContext(profile, { headless: true, baseURL });
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto("/en/account");
    await expect(page.locator("main")).toContainText(email);
    await page.getByRole("link", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Confirm sign out", exact: true }).click();
    await expect(page).toHaveURL(/signedOut=1/);
    await page.goto("/en/cards/card_riyad_titanium?from=auth-test");
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/en/cards/card_riyad_titanium?from=auth-test`);
  } finally {
    await context.close();
  }
});
