import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { refreshXOAuthToken } from "@/lib/services/x-oauth";

describe("X OAuth refresh", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.X_CLIENT_ID = "client-id";
    process.env.X_CLIENT_SECRET = "";
    process.env.X_API_BASE_URL = "https://api.x.test/2";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("exchanges a refresh token for a rotated token pair", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 7200 })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(refreshXOAuthToken("old-refresh")).resolves.toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresIn: 7200
    });
    const [, request] = fetchMock.mock.calls[0];
    expect(request.body).toContain("grant_type=refresh_token");
    expect(request.body).toContain("refresh_token=old-refresh");
    expect(request.body).toContain("client_id=client-id");
  });
});
