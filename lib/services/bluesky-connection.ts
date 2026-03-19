function parseBoolean(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

export async function getBlueskyConnectionState() {
  const enabled = parseBoolean(process.env.BLUESKY_ENABLED);
  const handle = process.env.BLUESKY_HANDLE?.trim() || null;
  const appPasswordConfigured = Boolean(process.env.BLUESKY_APP_PASSWORD?.trim());
  const serviceUrl = process.env.BLUESKY_SERVICE_URL?.trim() || "https://bsky.social";

  const canPost = Boolean(enabled && handle && appPasswordConfigured);

  return {
    mode: "manual_env",
    enabled,
    canPost,
    handle,
    serviceUrl,
    appPasswordConfigured,
    reason: canPost
      ? null
      : !enabled
        ? "Bluesky is disabled in env"
        : !handle
          ? "BLUESKY_HANDLE is not configured"
          : !appPasswordConfigured
            ? "BLUESKY_APP_PASSWORD is not configured"
            : "Bluesky is not configured"
  };
}
