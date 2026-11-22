import { beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialsSignin } from "next-auth";
import { loginAction } from "@/app/[locale]/login/actions";
import { logoutAction } from "@/app/[locale]/logout/actions";
const mocks = vi.hoisted(() => ({ signIn: vi.fn(), signOut: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ signIn: mocks.signIn, revokeAndSignOut: mocks.signOut }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
function form() {
  const f = new FormData();
  f.set("email", "person@example.com");
  f.set("password", "wrong password");
  f.set("returnTo", "/en/cards/a?from=shortlist");
  return f;
}
beforeEach(() => {
  vi.resetAllMocks();
});
describe("login and confirmed logout actions", () => {
  it("returns one generic credential error and preserves successful redirects", async () => {
    mocks.signIn.mockRejectedValueOnce(new CredentialsSignin());
    expect(await loginAction("en", { error: null }, form())).toEqual({
      error: "invalidCredentials",
    });
    const redirect = new Error("NEXT_REDIRECT");
    mocks.signIn.mockRejectedValueOnce(redirect);
    await expect(loginAction("en", { error: null }, form())).rejects.toBe(redirect);
    expect(mocks.signIn).toHaveBeenLastCalledWith(
      "credentials",
      expect.objectContaining({ redirectTo: "/en/cards/a?from=shortlist" }),
    );
  });
  it("does not redirect to success when revocation fails", async () => {
    mocks.signOut.mockRejectedValue(new Error("offline"));
    expect(await logoutAction("en", { error: null }, form())).toEqual({ error: "unavailable" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("redirects only after successful server revocation", async () => {
    mocks.signOut.mockResolvedValue(undefined);
    const redirect = new Error("NEXT_REDIRECT");
    mocks.redirect.mockImplementation(() => {
      throw redirect;
    });
    await expect(logoutAction("en", { error: null }, form())).rejects.toBe(redirect);
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/en/login?signedOut=1&returnTo=%2Fen%2Fcards%2Fa%3Ffrom%3Dshortlist",
    );
  });
});
