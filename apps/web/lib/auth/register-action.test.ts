import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "next-auth";
import { registerAction } from "@/app/[locale]/register/actions";
const mocks = vi.hoisted(() => ({ register: vi.fn(), signIn: vi.fn() }));
vi.mock("@/lib/auth/register", () => ({ registerAccount: mocks.register }));
vi.mock("@/lib/auth/server", () => ({ signIn: mocks.signIn }));
function form() {
  const data = new FormData();
  data.set("email", "person@example.com");
  data.set("password", "River stone lantern meadow!");
  data.set("role", "admin");
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
});
describe("registration action", () => {
  it("signs in the newly created account and preserves the successful Next.js redirect", async () => {
    mocks.register.mockResolvedValue({ ok: true, email: "person@example.com" });
    const redirect = new Error("NEXT_REDIRECT");
    mocks.signIn.mockRejectedValue(redirect);
    await expect(registerAction("ar", { error: null }, form())).rejects.toBe(redirect);
    expect(mocks.signIn).toHaveBeenCalledWith("credentials", {
      email: "person@example.com",
      password: "River stone lantern meadow!",
      redirectTo: "/ar/account",
    });
    expect(mocks.register.mock.calls[0]?.[1]).not.toHaveProperty("role");
  });
  it("does not sign in or create a second account on a duplicate", async () => {
    mocks.register.mockResolvedValue({ ok: false, error: "duplicateEmail" });
    expect(await registerAction("en", { error: null }, form())).toEqual({
      error: "duplicateEmail",
    });
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
  it("reports account creation separately from a failed automatic sign-in", async () => {
    mocks.register.mockResolvedValue({ ok: true, email: "person@example.com" });
    mocks.signIn.mockRejectedValue(new AuthError("unavailable"));
    expect(await registerAction("en", { error: null }, form())).toEqual({
      error: "createdLoginFailed",
    });
  });
});
