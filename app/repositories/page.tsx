export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

type Props = {
  searchParams?: Promise<{
    filter?: string;
  }>;
};

function matchesFilter(params: { filter: string; isPrivate: boolean; isActive: boolean }): boolean {
  switch (params.filter) {
    case "public":
      return !params.isPrivate;
    case "private":
      return params.isPrivate;
    case "active":
      return params.isActive;
    case "inactive":
      return !params.isActive;
    default:
      return true;
  }
}

export default async function RepositoriesPage({ searchParams }: Props) {
  async function toggleRepositoryActivation(formData: FormData) {
    "use server";
    const repositoryId = String(formData.get("repositoryId") ?? "");
    const nextState = String(formData.get("nextState") ?? "") === "true";

    if (!repositoryId) {
      return;
    }

    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      select: { id: true, isPrivate: true }
    });

    if (!repo || (repo.isPrivate && nextState)) {
      return;
    }

    await prisma.repositorySettings.upsert({
      where: { repositoryId },
      update: { isActive: nextState },
      create: { repositoryId, isActive: nextState }
    });

    revalidatePath("/repositories");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const filter = resolvedSearchParams.filter ?? "all";

  const repos = await prisma.repository.findMany({
    include: {
      settings: true
    },
    orderBy: {
      fullName: "asc"
    }
  });

  const filtered = repos.filter((repo) =>
    matchesFilter({ filter, isPrivate: repo.isPrivate, isActive: Boolean(repo.settings?.isActive) })
  );

  return (
    <section>
      <h1>Repositories</h1>
      <p>Select repositories where git-tweet is active (public repositories only).</p>
      <p>
        Filters: <Link href="/repositories">all</Link> | <Link href="/repositories?filter=public">public</Link> |{" "}
        <Link href="/repositories?filter=private">private</Link> | <Link href="/repositories?filter=active">active</Link> |{" "}
        <Link href="/repositories?filter=inactive">inactive</Link>
      </p>
      {filtered.length === 0 ? (
        <div className="card">
          <p>No repositories match this filter.</p>
          <small>Use GitHub connect flow and sync repositories.</small>
        </div>
      ) : (
        filtered.map((repo) => {
          const isActive = Boolean(repo.settings?.isActive);
          const isSupported = !repo.isPrivate;
          return (
            <article className="card" key={repo.id}>
              <strong>{repo.fullName}</strong>
              <p>
                <a href={repo.htmlUrl} target="_blank" rel="noreferrer">
                  {repo.htmlUrl}
                </a>
              </p>
              <small>
                Visibility: {repo.isPrivate ? "private" : "public"} | Activation: {isActive ? "active" : "inactive"} |{" "}
                Support: {isSupported ? "supported" : "unsupported"} | Topics: {repo.topics.join(", ") || "-"}
              </small>
              <p>
                <form action={toggleRepositoryActivation}>
                  <input type="hidden" name="repositoryId" value={repo.id} />
                  <input type="hidden" name="nextState" value={isActive ? "false" : "true"} />
                  <button type="submit" disabled={!isSupported && !isActive}>
                    {isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </p>
            </article>
          );
        })
      )}
    </section>
  );
}
