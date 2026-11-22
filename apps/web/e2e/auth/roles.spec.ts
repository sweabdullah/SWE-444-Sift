import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@sift/db";
import { hashPassword } from "../../lib/auth/password";
import { randomUUID } from "node:crypto";
const url = process.env.SIFT_AUTH_TEST_DATABASE_URL;
if (
  !url ||
  !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith("_auth_spike_test")
)
  throw new Error("Use a disposable localhost *_auth_spike_test database");
const db = new PrismaClient({ datasourceUrl: url });
const password = "correct horse battery staple";
async function signIn(request: APIRequestContext, email: string, baseURL: string) {
  const csrf = (await (await request.get("/api/auth/csrf")).json()) as { csrfToken: string };
  const response = await request.post("/api/auth/callback/credentials", {
    form: { email, password, csrfToken: csrf.csrfToken, callbackUrl: baseURL + "/en/account" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(302);
}
test("direct requests enforce all roles and a demoted admin loses access with its old cookie", async ({
  request,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Missing base URL");
  expect((await request.get("/en")).status()).toBe(200); // public catalogue remains public.
  expect((await request.get("/api/account")).status()).toBe(401);
  expect((await request.get("/api/admin/access")).status()).toBe(403);
  const suffix = randomUUID();
  const emails = [`role-user-${suffix}@example.com`, `role-admin-${suffix}@example.com`];
  try {
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: { email: emails[0] ?? "", passwordHash, role: "user" },
    });
    const admin = await db.user.create({
      data: { email: emails[1] ?? "", passwordHash, role: "admin" },
    });
    await signIn(request, user.email, baseURL);
    expect(
      (
        await request.get("/api/admin/access?role=admin", { headers: { "x-user-role": "admin" } })
      ).status(),
    ).toBe(403);
    expect(await (await request.get(`/api/account?userId=${admin.id}`)).json()).toMatchObject({
      id: user.id,
      email: user.email,
      role: "user",
    });
    await signIn(request, admin.email, baseURL);
    const savedCookie = (await request.storageState()).cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    expect((await request.get("/api/admin/access")).status()).toBe(200);
    await db.user.update({ where: { id: admin.id }, data: { role: "user" } });
    expect(
      (await request.get("/api/admin/access", { headers: { cookie: savedCookie } })).status(),
    ).toBe(403);
    await db.user.delete({ where: { id: admin.id } });
    expect((await request.get("/api/account", { headers: { cookie: savedCookie } })).status()).toBe(
      401,
    );
  } finally {
    await db.user.deleteMany({ where: { email: { in: emails } } });
    await db.$disconnect();
  }
});
