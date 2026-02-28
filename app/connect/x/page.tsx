import { revalidatePath } from "next/cache";
import { getXConnectionState, syncManualXConnection } from "@/lib/services/x-connection";

export default async function ConnectXPage() {
  const state = await getXConnectionState();

  async function syncConnectionAction() {
    "use server";
    await syncManualXConnection();
    revalidatePath("/connect/x");
  }

  return (
    <section className="card">
      <h1>Connect X</h1>
      <p>Current mode: <code>{state.mode}</code></p>
      <p>Can post now: <strong>{state.canPost ? "yes" : "no"}</strong></p>
      <p>Manual env credentials configured: <strong>{state.envConfigured ? "yes" : "no"}</strong></p>
      {state.account ? (
        <p>
          Connected account: <code>{state.account.providerUser}</code> (updated {state.account.updatedAt})
        </p>
      ) : (
        <p>No connected account saved yet.</p>
      )}
      {state.reason ? <small>{state.reason}</small> : null}
      <p>
        <form action={syncConnectionAction}>
          <button type="submit">Sync X connection from env</button>
        </form>
      </p>
      <small>
        Temporary MVP mode: `manual_env`. Set `X_ACCESS_TOKEN`, then sync. OAuth flow is postponed.
      </small>
    </section>
  );
}
