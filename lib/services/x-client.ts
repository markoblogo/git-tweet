export type XPostResult =
  | { ok: true; externalId: string }
  | {
      ok: false;
      code:
        | "NOT_CONNECTED"
        | "NOT_IMPLEMENTED"
        | "AUTH_ERROR"
        | "RATE_LIMIT"
        | "VALIDATION_ERROR"
        | "NETWORK_ERROR"
        | "REMOTE_ERROR";
      message: string;
    };

export type XClient = {
  publishPost(params: { text: string; accessToken?: string | null }): Promise<XPostResult>;
};

function connectionMode() {
  return (process.env.X_CONNECTION_MODE ?? "manual_env").toLowerCase();
}

function resolveAccessToken(explicitToken?: string | null): string | null {
  if (explicitToken) {
    return explicitToken;
  }

  if (connectionMode() === "manual_env" && process.env.X_ACCESS_TOKEN) {
    return process.env.X_ACCESS_TOKEN;
  }

  return null;
}

function apiBaseUrl(): string {
  return process.env.X_API_BASE_URL ?? "https://api.x.com/2";
}

function requestTimeoutMs(): number {
  const timeoutMs = Number(process.env.X_HTTP_TIMEOUT_MS ?? "8000");
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    return timeoutMs;
  }
  return 8000;
}

function toErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") {
    return fallback;
  }

  const record = body as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail.length > 0) {
    return record.detail;
  }

  if (typeof record.title === "string" && record.title.length > 0) {
    return record.title;
  }

  return fallback;
}

export function buildXClient(): XClient {
  return {
    async publishPost(params) {
      if (connectionMode() === "stub_success") {
        return {
          ok: true,
          externalId: `stub-${Date.now()}`
        };
      }

      if (connectionMode() !== "manual_env") {
        return {
          ok: false,
          code: "NOT_IMPLEMENTED",
          message: `Unsupported X_CONNECTION_MODE: ${connectionMode()}`
        };
      }

      const accessToken = resolveAccessToken(params.accessToken);
      if (!accessToken) {
        return {
          ok: false,
          code: "NOT_CONNECTED",
          message: "X account is not connected. Set X_ACCESS_TOKEN and sync /connect/x."
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs());

      try {
        const response = await fetch(`${apiBaseUrl()}/tweets`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({ text: params.text }),
          signal: controller.signal
        });

        const raw = await response.text();
        let json: unknown = null;
        if (raw) {
          try {
            json = JSON.parse(raw) as unknown;
          } catch {
            json = null;
          }
        }

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return {
              ok: false,
              code: "AUTH_ERROR",
              message: toErrorMessage(json, `X API auth error (${response.status})`)
            };
          }

          if (response.status === 429) {
            return {
              ok: false,
              code: "RATE_LIMIT",
              message: toErrorMessage(json, "X API rate limited (429)")
            };
          }

          if (response.status === 400) {
            return {
              ok: false,
              code: "VALIDATION_ERROR",
              message: toErrorMessage(json, "X API validation error (400)")
            };
          }

          return {
            ok: false,
            code: "REMOTE_ERROR",
            message: toErrorMessage(json, `X API error (${response.status})`)
          };
        }

        const id = (json as { data?: { id?: string } } | null)?.data?.id;
        if (!id) {
          return {
            ok: false,
            code: "REMOTE_ERROR",
            message: "X API success response does not include tweet id"
          };
        }

        return {
          ok: true,
          externalId: id
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return {
            ok: false,
            code: "NETWORK_ERROR",
            message: "X API request timed out"
          };
        }

        return {
          ok: false,
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "X API request failed"
        };
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}
