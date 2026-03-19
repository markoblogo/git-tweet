import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("buildBlueskyClient", () => {
  it("returns NOT_CONFIGURED when Bluesky is disabled", async () => {
    process.env.BLUESKY_ENABLED = "false";
    delete process.env.BLUESKY_HANDLE;
    delete process.env.BLUESKY_APP_PASSWORD;

    const { buildBlueskyClient } = await import("@/lib/services/bluesky-client");
    const client = buildBlueskyClient();
    const result = await client.publishPost({ text: "hello" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_CONFIGURED");
    }
  });

  it("returns NOT_CONFIGURED when required env vars are missing", async () => {
    process.env.BLUESKY_ENABLED = "true";
    process.env.BLUESKY_HANDLE = "abvx.xyz";
    delete process.env.BLUESKY_APP_PASSWORD;

    const { buildBlueskyClient } = await import("@/lib/services/bluesky-client");
    const client = buildBlueskyClient();
    const result = await client.publishPost({ text: "hello" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NOT_CONFIGURED");
    }
  });

  it("maps SDK login failures to AUTH_ERROR", async () => {
    process.env.BLUESKY_ENABLED = "true";
    process.env.BLUESKY_HANDLE = "abvx.xyz";
    process.env.BLUESKY_APP_PASSWORD = "app-password";
    process.env.BLUESKY_SERVICE_URL = "https://bsky.social";

    vi.doMock("@atproto/api", async () => ({
      ...(await vi.importActual<object>("@atproto/api")),
      BskyAgent: class {
        async login() {
          throw new Error("Authentication Required");
        }
      }
    }));

    const { buildBlueskyClient: buildClient } = await import("@/lib/services/bluesky-client");
    const client = buildClient();
    const result = await client.publishPost({ text: "hello" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("AUTH_ERROR");
    }
  });
});
