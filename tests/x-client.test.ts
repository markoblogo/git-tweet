import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildXClient } from "@/lib/services/x-client";

describe("x-client manual_env", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.X_CONNECTION_MODE = "manual_env";
    process.env.X_API_BASE_URL = "https://api.x.test/2";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns NOT_CONNECTED when token is missing", async () => {
    delete process.env.X_ACCESS_TOKEN;

    const result = await buildXClient().publishPost({ text: "hello" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_CONNECTED");
    }
  });

  it("posts successfully when API returns tweet id", async () => {
    process.env.X_ACCESS_TOKEN = "token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ data: { id: "19001" } })
      })
    );

    const result = await buildXClient().publishPost({ text: "hello" });
    expect(result).toEqual({ ok: true, externalId: "19001" });
  });

  it("maps 401 to AUTH_ERROR", async () => {
    process.env.X_ACCESS_TOKEN = "token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: "Unauthorized" })
      })
    );

    const result = await buildXClient().publishPost({ text: "hello" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("AUTH_ERROR");
      expect(result.message).toContain("Unauthorized");
    }
  });
});
