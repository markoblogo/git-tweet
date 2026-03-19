export const dynamic = "force-dynamic";

import { getBlueskyConnectionState } from "@/lib/services/bluesky-connection";

export default async function ConnectBlueskyPage() {
  const state = await getBlueskyConnectionState();

  return (
    <section className="card">
      <h1>Connect Bluesky</h1>
      <p>
        Mode: <code>{state.mode}</code>
      </p>
      <p>
        Status: <strong>{state.canPost ? "configured" : "not configured"}</strong>
      </p>
      <p>
        Enabled: <strong>{state.enabled ? "true" : "false"}</strong>
      </p>
      <p>
        Handle: <code>{state.handle ?? "not set"}</code>
      </p>
      <p>
        Service URL: <code>{state.serviceUrl}</code>
      </p>
      <p>
        App password: <strong>{state.appPasswordConfigured ? "configured" : "missing"}</strong>
      </p>

      {state.reason ? (
        <p>
          <small>Reason: {state.reason}</small>
        </p>
      ) : null}

      <small>
        Bluesky currently uses manual env mode only. Set `BLUESKY_ENABLED`, `BLUESKY_HANDLE`,
        `BLUESKY_APP_PASSWORD`, and restart the app. No OAuth UI is used in this stage.
      </small>
    </section>
  );
}
