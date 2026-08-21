import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeOAuthState, OAUTH_STATE_COOKIE } from "../shared/const";

const { createSessionToken, exchangeCodeForToken, getUserInfo, upsertUser } = vi.hoisted(() => ({
  createSessionToken: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getUserInfo: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("./db", () => ({ upsertUser }));
vi.mock("./_core/sdk", () => ({ sdk: { createSessionToken, exchangeCodeForToken, getUserInfo } }));

import { registerOAuthRoutes } from "./_core/oauth";

describe("OAuth callback", () => {
  beforeEach(() => {
    exchangeCodeForToken.mockResolvedValue({ accessToken: "access-token" });
    getUserInfo.mockResolvedValue({ openId: "owner-open-id", name: "Owner", email: "owner@example.com" });
    createSessionToken.mockResolvedValue("session-token");
    upsertUser.mockResolvedValue(undefined);
  });

  it("persists the user, creates a session, and returns to the original /admin route", async () => {
    let callback: ((req: any, res: any) => Promise<void>) | undefined;
    registerOAuthRoutes({ get: (_path: string, handler: typeof callback) => { callback = handler; } } as any);
    const nonce = "nonce-123";
    const state = encodeOAuthState({ redirectUri: "https://example.test/api/oauth/callback", nonce, returnTo: "/admin" });
    const response = { clearCookie: vi.fn(), cookie: vi.fn(), redirect: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };

    await callback!({ query: { code: "oauth-code", state }, headers: { cookie: `${OAUTH_STATE_COOKIE}=${nonce}` } }, response);

    expect(upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "owner-open-id" }));
    expect(createSessionToken).toHaveBeenCalledWith("owner-open-id", expect.any(Object));
    expect(response.cookie).toHaveBeenCalledWith("app_session_id", "session-token", expect.any(Object));
    expect(response.redirect).toHaveBeenCalledWith(302, "/admin");
  });
});
