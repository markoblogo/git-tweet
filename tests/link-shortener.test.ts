import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getShareableRepoUrl } from "@/lib/services/link-shortener";

describe("getShareableRepoUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns original url when shortener is disabled", async () => {
    process.env.SHORTENER_ENABLED = "false";

    const result = await getShareableRepoUrl("https://github.com/markoblogo/git-tweet");
    expect(result.url).toBe("https://github.com/markoblogo/git-tweet");
    expect(result.shortened).toBe(false);
    expect(result.provider).toBe("none");
  });

  it("returns shortened url when API succeeds", async () => {
    process.env.SHORTENER_ENABLED = "true";
    process.env.SHORTENER_API_URL = "https://shortener.local/api/shorten";
    process.env.SHORTENER_PUBLIC_BASE_URL = "https://go.abvx.xyz/";
    process.env.SHORTENER_API_KEY = "release-writer";
    process.env.SHORTENER_API_KEY_ID = "git-tweet";

    const request = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ shortUrl: "https://go.abvx.xyz/abc123" })
      });
    vi.stubGlobal("fetch", request);

    const result = await getShareableRepoUrl("https://github.com/markoblogo/git-tweet");
    expect(result.url).toBe("https://go.abvx.xyz/abc123");
    expect(result.shortened).toBe(true);
    expect(result.provider).toBe("abvx-shortener");
    expect(request).toHaveBeenCalledWith(
      "https://shortener.local/api/shorten",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-API-Key": "release-writer",
          "X-API-Key-Id": "git-tweet"
        })
      })
    );
  });

  it("falls back to original url when shortener fails", async () => {
    process.env.SHORTENER_ENABLED = "true";
    process.env.SHORTENER_API_URL = "https://shortener.local/api/shorten";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({})
      })
    );

    const result = await getShareableRepoUrl("https://github.com/markoblogo/git-tweet");
    expect(result.url).toBe("https://github.com/markoblogo/git-tweet");
    expect(result.shortened).toBe(false);
    expect(result.error).toBe("shortener_http_503");
  });
});
