type ShortenerResult = {
  url: string;
  shortened: boolean;
  provider: "none" | "abvx-shortener";
  error?: string;
};

function parseBoolean(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

function extractShortUrl(responseBody: unknown): string | null {
  if (!responseBody || typeof responseBody !== "object") {
    return null;
  }

  const body = responseBody as Record<string, unknown>;
  const direct = body.shortUrl ?? body.short_url ?? body.url;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  const data = body.data;
  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>).shortUrl ?? (data as Record<string, unknown>).short_url;
    if (typeof nested === "string" && nested.length > 0) {
      return nested;
    }
  }

  return null;
}

function shortenerConfig() {
  const enabled = parseBoolean(process.env.SHORTENER_ENABLED);
  const endpoint = process.env.SHORTENER_API_URL;
  const apiKey = process.env.SHORTENER_API_KEY;
  const publicBaseUrl = process.env.SHORTENER_PUBLIC_BASE_URL;
  const timeoutMs = Number(process.env.SHORTENER_TIMEOUT_MS ?? "2000");

  return {
    enabled,
    endpoint,
    apiKey,
    publicBaseUrl,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 2000
  };
}

export async function getShareableRepoUrl(originalUrl: string): Promise<ShortenerResult> {
  const config = shortenerConfig();

  if (!config.enabled) {
    return { url: originalUrl, shortened: false, provider: "none" };
  }

  if (!config.endpoint) {
    return {
      url: originalUrl,
      shortened: false,
      provider: "none",
      error: "SHORTENER_API_URL is not configured"
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({ url: originalUrl }),
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        url: originalUrl,
        shortened: false,
        provider: "abvx-shortener",
        error: `shortener_http_${response.status}`
      };
    }

    const json = (await response.json()) as unknown;
    const shortened = extractShortUrl(json);
    if (!shortened) {
      return {
        url: originalUrl,
        shortened: false,
        provider: "abvx-shortener",
        error: "shortener_invalid_response"
      };
    }

    if (config.publicBaseUrl && !shortened.startsWith(config.publicBaseUrl)) {
      return {
        url: originalUrl,
        shortened: false,
        provider: "abvx-shortener",
        error: "shortener_unexpected_domain"
      };
    }

    return {
      url: shortened,
      shortened: true,
      provider: "abvx-shortener"
    };
  } catch (error) {
    return {
      url: originalUrl,
      shortened: false,
      provider: "abvx-shortener",
      error: error instanceof Error ? error.message : "shortener_request_failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}
