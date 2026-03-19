import { AppBskyEmbedExternal, BskyAgent, RichText } from "@atproto/api";

export type BlueskyPostResult =
  | { ok: true; externalId: string }
  | {
      ok: false;
      code:
        | "NOT_CONFIGURED"
        | "AUTH_ERROR"
        | "RATE_LIMIT"
        | "VALIDATION_ERROR"
        | "NETWORK_ERROR"
        | "REMOTE_ERROR";
      message: string;
    };

export type BlueskyClient = {
  publishPost(params: { text: string; targetUrl: string }): Promise<BlueskyPostResult>;
};

function parseBoolean(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

function blueskyConfig() {
  return {
    enabled: parseBoolean(process.env.BLUESKY_ENABLED),
    handle: process.env.BLUESKY_HANDLE?.trim(),
    appPassword: process.env.BLUESKY_APP_PASSWORD?.trim(),
    serviceUrl: process.env.BLUESKY_SERVICE_URL?.trim() || "https://bsky.social"
  };
}

function hasRequiredConfig(config: ReturnType<typeof blueskyConfig>): boolean {
  return Boolean(config.enabled && config.handle && config.appPassword);
}

function toBlueskyErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const record = error as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.length > 0) {
    return record.message;
  }

  const status = typeof record.status === "number" ? record.status : undefined;
  const errorBody = record.error;
  if (errorBody && typeof errorBody === "object") {
    const body = errorBody as Record<string, unknown>;
    if (typeof body.message === "string" && body.message.length > 0) {
      return body.message;
    }
    if (typeof body.error === "string" && body.error.length > 0) {
      return body.error;
    }
  }

  return status ? `${fallback} (${status})` : fallback;
}

function fallbackTitle(text: string): string {
  return text.split("\n").map((line) => line.trim()).find(Boolean) || "git-tweet update";
}

function fallbackDescription(text: string): string {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines[1] || lines[0] || "Shared from git-tweet";
}

function matchMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i")
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

async function resolveExternalCard(
  agent: BskyAgent,
  params: { targetUrl: string; text: string }
): Promise<AppBskyEmbedExternal.Main & { $type: "app.bsky.embed.external" }> {
  let title = fallbackTitle(params.text);
  let description = fallbackDescription(params.text);
  let thumb: AppBskyEmbedExternal.External["thumb"] | undefined;

  try {
    const response = await fetch(params.targetUrl, {
      headers: {
        "user-agent": "git-tweet/0.1"
      }
    });

    if (response.ok) {
      const html = await response.text();
      title = matchMeta(html, "og:title") || matchMeta(html, "twitter:title") || title;
      description =
        matchMeta(html, "og:description") || matchMeta(html, "twitter:description") || description;

      const imageUrl = matchMeta(html, "og:image") || matchMeta(html, "twitter:image");
      if (imageUrl) {
        const imageResponse = await fetch(imageUrl, {
          headers: {
            "user-agent": "git-tweet/0.1"
          }
        });

        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get("content-type") || "image/png";
          const bytes = new Uint8Array(await imageResponse.arrayBuffer());
          const uploaded = await agent.uploadBlob(bytes, {
            encoding: contentType
          });
          thumb = uploaded.data.blob;
        }
      }
    }
  } catch {
    // External card metadata is best-effort. Post creation should continue without a thumb.
  }

  return {
    $type: "app.bsky.embed.external",
    external: {
      uri: params.targetUrl,
      title,
      description,
      thumb
    }
  };
}

export function buildBlueskyClient(): BlueskyClient {
  return {
    async publishPost(params) {
      const config = blueskyConfig();
      if (!hasRequiredConfig(config)) {
        return {
          ok: false,
          code: "NOT_CONFIGURED",
          message: "Bluesky is disabled or not configured. Set BLUESKY_ENABLED, BLUESKY_HANDLE, and BLUESKY_APP_PASSWORD."
        };
      }

      const agent = new BskyAgent({
        service: config.serviceUrl
      });

      try {
        await agent.login({
          identifier: config.handle!,
          password: config.appPassword!
        });

        const richText = new RichText({
          text: params.text
        });
        await richText.detectFacets(agent);
        const embed = await resolveExternalCard(agent, {
          targetUrl: params.targetUrl,
          text: params.text
        });

        const response = await agent.post({
          text: richText.text,
          facets: richText.facets,
          embed,
          createdAt: new Date().toISOString()
        });

        if (!response?.uri) {
          return {
            ok: false,
            code: "REMOTE_ERROR",
            message: "Bluesky success response did not include a post uri"
          };
        }

        return {
          ok: true,
          externalId: response.uri
        };
      } catch (error) {
        if (error instanceof Error) {
          const message = error.message;
          if (/401|403|Authentication|Invalid/i.test(message)) {
            return {
              ok: false,
              code: "AUTH_ERROR",
              message: toBlueskyErrorMessage(error, "Bluesky authentication failed")
            };
          }

          if (/429|rate/i.test(message)) {
            return {
              ok: false,
              code: "RATE_LIMIT",
              message: toBlueskyErrorMessage(error, "Bluesky rate limited")
            };
          }

          if (/400|validation|record/i.test(message)) {
            return {
              ok: false,
              code: "VALIDATION_ERROR",
              message: toBlueskyErrorMessage(error, "Bluesky validation failed")
            };
          }

          if (/fetch|network|ECONN|ENOTFOUND|timeout/i.test(message)) {
            return {
              ok: false,
              code: "NETWORK_ERROR",
              message: toBlueskyErrorMessage(error, "Bluesky request failed")
            };
          }
        }

        return {
          ok: false,
          code: "REMOTE_ERROR",
          message: toBlueskyErrorMessage(error, "Bluesky request failed")
        };
      }
    }
  };
}
