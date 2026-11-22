import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireUser, requireAdmin, withRole, AccessDenied } from "./guards";
import { GET as account } from "@/app/api/account/route";
import { GET as admin } from "@/app/api/admin/access/route";
import type { Session } from "next-auth";
const mocks = vi.hoisted(() => ({ auth: vi.fn<() => Promise<Session | null>>() }));
vi.mock("server-only", () => ({}));
vi.mock("./server", () => ({ auth: mocks.auth }));
function session(role: "user" | "admin"): Session {
  return {
    expires: new Date().toISOString(),
    user: { id: "own-id", email: "own@example.test", role },
  };
}
beforeEach(() => {
  mocks.auth.mockReset();
});
describe("protected server handlers", () => {
  it.each([
    [null, 401, 403],
    [session("user"), 200, 403],
    [session("admin"), 200, 200],
  ] as const)(
    "enforces the visitor/user/admin matrix for %j",
    async (identity, userStatus, adminStatus) => {
      mocks.auth.mockResolvedValue(identity);
      const userResponse = await account(
        new Request("http://local/api/account?userId=someone-else&role=admin"),
      );
      expect(userResponse.status).toBe(userStatus);
      if (userStatus === 200)
        expect(await userResponse.json()).toEqual({
          id: "own-id",
          email: "own@example.test",
          role: identity?.user.role,
        });
      const adminResponse = await admin(
        new Request("http://local/api/admin/access?role=admin", {
          headers: { "x-user-role": "admin" },
        }),
      );
      expect(adminResponse.status).toBe(adminStatus);
      expect(mocks.auth).toHaveBeenCalledTimes(2);
      expect(adminResponse.headers.get("cache-control")).toBe("private, no-store");
    },
  );
  it("does not run protected handler logic when denied", async () => {
    mocks.auth.mockResolvedValue(session("user"));
    const mutation = vi.fn(() => Response.json({ success: true }));
    const response = await withRole(
      "admin",
      mutation,
    )(new Request("http://local", { method: "POST" }));
    expect(response.status).toBe(403);
    expect(mutation).not.toHaveBeenCalled();
  });
  it("re-checks every call instead of caching an earlier admin identity", async () => {
    mocks.auth
      .mockResolvedValueOnce(session("admin"))
      .mockResolvedValueOnce(session("user"))
      .mockResolvedValueOnce(null);
    expect((await requireAdmin()).role).toBe("admin");
    await expect(requireAdmin()).rejects.toMatchObject({ status: 403 });
    await expect(requireUser()).rejects.toMatchObject({ status: 401 });
  });
  it("does not convert arbitrary handler failures into authentication errors", async () => {
    mocks.auth.mockResolvedValue(session("user"));
    const failure = new Error("operation failed");
    await expect(
      withRole("user", () => {
        throw failure;
      })(new Request("http://local")),
    ).rejects.toBe(failure);
  });
  it("exposes only safe machine-readable denial codes", () => {
    expect(new AccessDenied(401).message).toBe("UNAUTHENTICATED");
    expect(new AccessDenied(403).message).toBe("FORBIDDEN");
  });
});
