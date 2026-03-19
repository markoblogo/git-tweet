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

  it("publishes an external embed with targetUrl", async () => {
    process.env.BLUESKY_ENABLED = "true";
    process.env.BLUESKY_HANDLE = "abvx.xyz";
    process.env.BLUESKY_APP_PASSWORD = "app-password";
    process.env.BLUESKY_SERVICE_URL = "https://bsky.social";

    const postMock = vi.fn().mockResolvedValue({
      uri: "at://example/app.bsky.feed.post/123"
    });
    const uploadBlobMock = vi.fn().mockResolvedValue({
      data: {
        blob: { $type: "blob", ref: { $link: "bafk" }, mimeType: "image/png", size: 10 }
      }
    });

    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<meta property="og:title" content="git-tweet"><meta property="og:description" content="Low-noise releases"><meta property="og:image" content="https://example.com/og.png">'
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer
      }) as typeof fetch);

    vi.doMock("@atproto/api", async () => {
      const actual = await vi.importActual<object>("@atproto/api");
      return {
        ...actual,
        RichText: class {
          text: string;
          facets: undefined;
          constructor(params: { text: string }) {
            this.text = params.text;
            this.facets = undefined;
          }
          async detectFacets() {}
        },
        BskyAgent: class {
          async login() {}
          async uploadBlob(data: Uint8Array, opts: { encoding?: string }) {
            return uploadBlobMock(data, opts);
          }
          async post(input: unknown) {
            return postMock(input);
          }
        }
      };
    });

    const { buildBlueskyClient: buildClient } = await import("@/lib/services/bluesky-client");
    const client = buildClient();
    const result = await client.publishPost({
      text: "Released v0.2.0: git-tweet\nLow-noise releases.\nhttps://github.com/markoblogo/git-tweet?preview=v2",
      targetUrl: "https://github.com/markoblogo/git-tweet?preview=v2"
    });

    expect(result.ok).toBe(true);
    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock.mock.calls[0]?.[0]).toMatchObject({
      embed: {
        $type: "app.bsky.embed.external",
        external: {
          uri: "https://github.com/markoblogo/git-tweet?preview=v2",
          title: "git-tweet",
          description: "Low-noise releases"
        }
      }
    });
  });
});
