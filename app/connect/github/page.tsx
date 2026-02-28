export const dynamic = "force-dynamic";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getGitHubConnectionState, syncGitHubRepositories } from "@/lib/services/github-client";

type Props = {
  searchParams?: Promise<{
    connected?: string;
    error?: string;
  }>;
};

export default async function ConnectGitHubPage({ searchParams }: Props) {
  const state = await getGitHubConnectionState();
  const resolvedSearchParams = (await searchParams) ?? {};

  async function syncAction() {
    "use server";
    try {
      await syncGitHubRepositories();
    } catch {
      // Keep page stable; operator can inspect /logs and connection status.
    }
    revalidatePath("/connect/github");
    revalidatePath("/repositories");
  }

  return (
    <section className="card">
      <h1>Connect GitHub</h1>
      <p>
        Status: <strong>{state.connected ? "connected" : "not connected"}</strong>
      </p>
      {state.account ? (
        <p>
          Account id: <code>{state.account.providerUser}</code> (updated {state.account.updatedAt})
        </p>
      ) : null}

      {resolvedSearchParams.connected === "1" ? <p><small>GitHub connected successfully.</small></p> : null}
      {resolvedSearchParams.error ? <p><small>Error: {resolvedSearchParams.error}</small></p> : null}

      <p>
        <Link href="/api/connect/github/start">{state.connected ? "Reconnect GitHub" : "Connect GitHub"}</Link>
      </p>

      <form action={syncAction}>
        <button type="submit">Sync repositories from GitHub</button>
      </form>

      <small>
        Sync imports your repositories and keeps them inactive by default. Private repositories are marked unsupported and cannot be activated for posting.
      </small>
    </section>
  );
}
