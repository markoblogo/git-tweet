import { Provider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { githubFetch, type GitHubRepoPayload } from "@/lib/services/github-client";
import { handleReleasePublished } from "@/lib/services/github-ingestion";
import { autoActivateOwners } from "@/lib/services/repository-policy";
import { decryptToken } from "@/lib/services/token-vault";

export type GitHubReleaseApiPayload = {
  id: number;
  tag_name: string;
  published_at: string | null;
  html_url: string;
  name?: string | null;
  body?: string | null;
  draft: boolean;
  prerelease: boolean;
};

export function selectRecentPublishedReleases(
  releases: GitHubReleaseApiPayload[],
  now = new Date(),
  lookbackMinutes = 24 * 60
): GitHubReleaseApiPayload[] {
  const cutoff = now.getTime() - lookbackMinutes * 60_000;

  return releases
    .filter((release) => {
      if (release.draft || release.prerelease || !release.published_at) {
        return false;
      }
      const publishedAt = Date.parse(release.published_at);
      return Number.isFinite(publishedAt) && publishedAt >= cutoff && publishedAt <= now.getTime();
    })
    .sort(
      (left, right) =>
        Date.parse(left.published_at as string) - Date.parse(right.published_at as string)
    );
}

async function listOwnedPublicRepositories(accessToken: string): Promise<GitHubRepoPayload[]> {
  const repositories: GitHubRepoPayload[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const chunk = await githubFetch<GitHubRepoPayload[]>(
      `/user/repos?visibility=public&affiliation=owner&per_page=100&page=${page}&sort=updated`,
      accessToken
    );
    repositories.push(...chunk);
    if (chunk.length < 100) break;
  }

  return repositories;
}

export async function pollRecentGitHubReleases(params: {
  now?: Date;
  lookbackMinutes?: number;
} = {}): Promise<{
  ok: boolean;
  scannedRepositories: number;
  discoveredReleases: number;
  errors: Array<{ repository: string; message: string }>;
}> {
  const owners = autoActivateOwners();
  if (owners.size === 0) {
    throw new Error("GITHUB_AUTO_ACTIVATE_OWNERS is not configured");
  }

  const account = await prisma.connectedAccount.findFirst({
    where: { provider: Provider.GITHUB, accessToken: { not: null } },
    orderBy: { updatedAt: "desc" }
  });
  if (!account?.accessToken) {
    throw new Error("GitHub is not connected");
  }

  const accessToken = decryptToken(account.accessToken);
  const repositories = (await listOwnedPublicRepositories(accessToken)).filter(
    (repository) => !repository.private && owners.has(repository.owner.login.toLowerCase())
  );
  const errors: Array<{ repository: string; message: string }> = [];
  let discoveredReleases = 0;

  for (let index = 0; index < repositories.length; index += 10) {
    const batch = repositories.slice(index, index + 10);
    await Promise.all(
      batch.map(async (repository) => {
        try {
          const releases = await githubFetch<GitHubReleaseApiPayload[]>(
            `/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/releases?per_page=5`,
            accessToken
          );
          const recent = selectRecentPublishedReleases(
            releases,
            params.now,
            params.lookbackMinutes
          );
          discoveredReleases += recent.length;

          for (const release of recent) {
            await handleReleasePublished({
              action: "published",
              repository: {
                id: repository.id,
                name: repository.name,
                full_name: repository.full_name,
                html_url: repository.html_url,
                description: repository.description,
                private: repository.private,
                topics: repository.topics ?? [],
                owner: repository.owner
              },
              release: {
                ...release,
                published_at: release.published_at as string
              }
            });
          }
        } catch (error) {
          errors.push({
            repository: repository.full_name,
            message: error instanceof Error ? error.message : "Unknown polling error"
          });
        }
      })
    );
  }

  return {
    ok: errors.length === 0,
    scannedRepositories: repositories.length,
    discoveredReleases,
    errors
  };
}
