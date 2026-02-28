import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

export default async function RepositoriesPage() {
  async function toggleRepositoryActivation(formData: FormData) {
    "use server";
    const repositoryId = String(formData.get("repositoryId") ?? "");
    const nextState = String(formData.get("nextState") ?? "") === "true";

    if (!repositoryId) {
      return;
    }

    await prisma.repositorySettings.upsert({
      where: { repositoryId },
      update: { isActive: nextState },
      create: { repositoryId, isActive: nextState }
    });

    revalidatePath("/repositories");
  }

  const repos = await prisma.repository.findMany({
    include: {
      settings: true
    },
    orderBy: {
      fullName: "asc"
    }
  });

  return (
    <section>
      <h1>Repositories</h1>
      <p>Select repos where git-tweet is active.</p>
      {repos.length === 0 ? (
        <div className="card">
          <p>No repositories synced yet.</p>
          <small>Use GitHub connect flow, then sync repo list via API.</small>
        </div>
      ) : (
        repos.map((repo) => (
          <article className="card" key={repo.id}>
            <strong>{repo.fullName}</strong>
            <p>
              <a href={repo.htmlUrl} target="_blank" rel="noreferrer">
                {repo.htmlUrl}
              </a>
            </p>
            <small>
              Activation:{" "}
              {repo.settings ? (repo.settings.isActive ? "active" : "inactive") : "not configured (defaults to inactive)"}{" "}
              | Topics: {repo.topics.join(", ") || "-"}
            </small>
            <p>
              <form action={toggleRepositoryActivation}>
                <input type="hidden" name="repositoryId" value={repo.id} />
                <input
                  type="hidden"
                  name="nextState"
                  value={repo.settings?.isActive ? "false" : "true"}
                />
                <button type="submit">
                  {repo.settings?.isActive ? "Deactivate" : "Activate"}
                </button>
              </form>
            </p>
          </article>
        ))
      )}
    </section>
  );
}
