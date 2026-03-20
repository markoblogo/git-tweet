export const dynamic = "force-dynamic";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPageAccess } from "@/lib/services/admin-gate";
import { getGitHubConnectionState, syncGitHubRepositories } from "@/lib/services/github-client";

type Props = {
  searchParams?: Promise<{
    connected?: string;
    error?: string;
    sync?: string;
    synced?: string;
    publicRepos?: string;
    privateRepos?: string;
  }>;
};

export default async function ConnectGitHubPage({ searchParams }: Props) {
  await requireAdminPageAccess("/connect/github");

  const state = await getGitHubConnectionState();
  const resolvedSearchParams = (await searchParams) ?? {};

  async function syncAction() {
    "use server";
    let result:
      | {
          synced: number;
          publicRepos: number;
          privateRepos: number;
        }
      | undefined;

    try {
      result = await syncGitHubRepositories();
    } catch {
      revalidatePath("/connect/github");
      revalidatePath("/repositories");
      redirect("/connect/github?error=github_sync_failed");
    }

    revalidatePath("/connect/github");
    revalidatePath("/repositories");
    redirect(
      `/connect/github?sync=1&synced=${result.synced}&publicRepos=${result.publicRepos}&privateRepos=${result.privateRepos}`
    );
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
      {resolvedSearchParams.sync === "1" ? (
        <p>
          <small>
            Sync complete: {resolvedSearchParams.synced ?? "0"} repos imported, public {resolvedSearchParams.publicRepos ?? "0"},
            private {resolvedSearchParams.privateRepos ?? "0"}.
          </small>
        </p>
      ) : null}
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
