export const dynamic = "force-dynamic";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getXConnectionState, syncManualXConnection } from "@/lib/services/x-connection";

type Props = {
  searchParams?: Promise<{
    connected?: string;
    account?: string;
    error?: string;
    mode?: string;
  }>;
};

export default async function ConnectXPage({ searchParams }: Props) {
  const state = await getXConnectionState();
  const resolvedSearchParams = (await searchParams) ?? {};

  async function syncConnectionAction() {
    "use server";
    await syncManualXConnection();
    revalidatePath("/connect/x");
  }

  return (
    <section className="card">
      <h1>Connect X</h1>
      <p>
        Mode: <code>{state.mode}</code>
      </p>
      <p>
        Status: <strong>{state.canPost ? "connected" : "not connected"}</strong>
      </p>
      {state.account ? (
        <p>
          Account id: <code>{state.account.providerUser}</code>
          {state.account.expiresAt ? ` | token expires at ${state.account.expiresAt}` : ""}
        </p>
      ) : null}

      {resolvedSearchParams.connected === "1" ? (
        <p><small>X connected successfully{resolvedSearchParams.account ? ` as ${resolvedSearchParams.account}` : ""}.</small></p>
      ) : null}
      {resolvedSearchParams.error ? <p><small>Error: {resolvedSearchParams.error}</small></p> : null}

      {state.mode === "manual_env" ? (
        <>
          <form action={syncConnectionAction}>
            <button type="submit">Sync X connection from env</button>
          </form>
          <small>
            Manual fallback mode is active. Set `X_ACCESS_TOKEN`, then sync.
          </small>
        </>
      ) : (
        <>
          <p>
            <Link href="/api/connect/x/start">{state.canPost ? "Reconnect X" : "Connect X"}</Link>
          </p>
          <small>
            OAuth mode is active. Connection is persisted in `connected_accounts` and used by posting adapter.
          </small>
        </>
      )}
    </section>
  );
}
