import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Session } from "next-auth";
import { spikeEnabled } from "./config";
import { GET } from "@/app/api/auth-spike-demo/[role]/route";
import AuthSpikePage from "@/app/[locale]/auth-spike/page";
import LocaleLayout from "@/app/[locale]/layout";

const serverMocks = vi.hoisted(() => ({ auth: vi.fn<() => Promise<Session | null>>() }));
vi.mock("./server", () => ({ auth: serverMocks.auth, signIn: vi.fn(), confirmedSignOut: vi.fn() }));
vi.mock("./config", () => ({ spikeEnabled: vi.fn() }));
vi.mock("@/lib/fonts", () => ({ fontVariables: "" }));
vi.mock("@/components/LocaleSwitch", () => ({ LocaleSwitch: () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: vi.fn(),
}));

function identity(role: "user" | "admin"): Session {
  return {
    expires: new Date(Date.now() + 1000).toISOString(),
    user: { id: "fixture", email: "fixture@example.test", role },
  };
}

beforeEach(() => {
  vi.mocked(spikeEnabled).mockReturnValue(true);
  serverMocks.auth.mockReset();
});

describe("direct protected HTTP handlers", () => {
  it.each([
    [null, "user", 401],
    [null, "admin", 401],
    [identity("user"), "user", 200],
    [identity("user"), "admin", 403],
    [identity("admin"), "admin", 200],
  ] as const)("checks server identity for role %s / %s", async (session, role, expected) => {
    serverMocks.auth.mockResolvedValue(session);
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ role }),
    });
    expect(response.status).toBe(expected);
    expect(serverMocks.auth).toHaveBeenCalledOnce();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("returns 404 while disabled without reading a session", async () => {
    vi.mocked(spikeEnabled).mockReturnValue(false);
    expect(
      (await GET(new Request("http://localhost"), { params: Promise.resolve({ role: "admin" }) }))
        .status,
    ).toBe(404);
    expect(serverMocks.auth).not.toHaveBeenCalled();
  });
});

describe("server component demo", () => {
  it.each(["ar", "en"] as const)(
    "reads a server session and follows the root language/direction in %s",
    async (locale) => {
      serverMocks.auth.mockResolvedValue(identity("user"));
      const params = Promise.resolve({ locale });
      const page = await AuthSpikePage({ params, searchParams: Promise.resolve({}) });
      const html = renderToStaticMarkup(await LocaleLayout({ params, children: page }));
      expect(html).toContain(`lang="${locale}"`);
      expect(html).toContain(`dir="${locale === "ar" ? "rtl" : "ltr"}"`);
      expect(html).toContain("fixture@example.test");
      expect(html).toContain(locale === "ar" ? "مستخدم مسجل" : "Registered user");
      expect(serverMocks.auth).toHaveBeenCalledOnce();
    },
  );
  it.each(["ar", "en"] as const)(
    "renders localized credential fields and generic errors in %s",
    async (locale) => {
      serverMocks.auth.mockResolvedValue(null);
      const html = renderToStaticMarkup(
        await AuthSpikePage({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ error: "credentials" }),
        }),
      );
      expect(html).toContain('type="password"');
      expect(html).toContain('role="alert"');
      expect(html).toContain(locale === "ar" ? "تعذر تسجيل الدخول" : "Unable to sign in");
    },
  );
  it("hides the demo when disabled before reading auth", async () => {
    vi.mocked(spikeEnabled).mockReturnValue(false);
    await expect(
      AuthSpikePage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NOT_FOUND");
    expect(serverMocks.auth).not.toHaveBeenCalled();
  });
});
