import { Provider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { githubFetch, type GitHubRepoPayload } from "@/lib/services/github-client";
import { handleReleasePublished } from "@/lib/services/github-ingestion";
import { autoActivateOwners } from "@/lib/services/repository-policy";
import { decryptToken } from "@/lib/services/token-vault";
import { loadReleaseSocialRepositories } from "@/lib/services/ecosystem-registry";

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
  lookbackMinutes = 24 * 60,
  notBefore: Date | null = null
): GitHubReleaseApiPayload[] {
  const cutoff = Math.max(
    now.getTime() - lookbackMinutes * 60_000,
    notBefore?.getTime() ?? Number.NEGATIVE_INFINITY
  );

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

export function releasePollingNotBefore(
  env: Record<string, string | undefined> = process.env
): Date | null {
  const raw = env.GITHUB_RELEASES_NOT_BEFORE?.trim();
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) {
    throw new Error("GITHUB_RELEASES_NOT_BEFORE must be an ISO-8601 timestamp");
  }
  return new Date(timestamp);
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
  processedReleases: number;
  existingReleases: number;
  deliveryStatus: Record<string, number>;
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
  const releaseSocialRepositories = await loadReleaseSocialRepositories();
  const repositories = (await listOwnedPublicRepositories(accessToken)).filter(
    (repository) =>
      !repository.private &&
      owners.has(repository.owner.login.toLowerCase()) &&
      (!releaseSocialRepositories || releaseSocialRepositories.has(repository.full_name.toLowerCase()))
  );
  const errors: Array<{ repository: string; message: string }> = [];
  let discoveredReleases = 0;
  let processedReleases = 0;
  let existingReleases = 0;
  const selectedSourceKeys = new Set<string>();
  const notBefore = releasePollingNotBefore();

  for (const repository of repositories) {
    try {
          const releases = await githubFetch<GitHubReleaseApiPayload[]>(
            `/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/releases?per_page=5`,
            accessToken
          );
          const recent = selectRecentPublishedReleases(
            releases,
            params.now,
            params.lookbackMinutes,
            notBefore
          );
          discoveredReleases += recent.length;

          const sourceKeys = recent.map((release) => `gh:release:${release.id}:published`);
          sourceKeys.forEach((sourceKey) => selectedSourceKeys.add(sourceKey));
          const existingEvents = sourceKeys.length
            ? await prisma.event.findMany({
                where: { sourceKey: { in: sourceKeys } },
                select: { sourceKey: true }
              })
            : [];
          const existingSourceKeys = new Set(existingEvents.map((event) => event.sourceKey));
          existingReleases += existingSourceKeys.size;

          for (const release of recent) {
            if (existingSourceKeys.has(`gh:release:${release.id}:published`)) continue;
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
            processedReleases += 1;
          }
    } catch (error) {
      errors.push({
        repository: repository.full_name,
        message: error instanceof Error ? error.message : "Unknown polling error"
      });
    }
  }

  const posts = selectedSourceKeys.size
    ? await prisma.post.findMany({
        where: { event: { sourceKey: { in: [...selectedSourceKeys] } } },
        select: { destination: true, status: true }
      })
    : [];
  const deliveryStatus = posts.reduce<Record<string, number>>((counts, post) => {
    const key = `${post.destination}:${post.status}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const hasDeliveryFailures = Object.entries(deliveryStatus).some(
    ([key, count]) => key.endsWith(":FAILED") && count > 0
  );

  return {
    ok: errors.length === 0 && !hasDeliveryFailures,
    scannedRepositories: repositories.length,
    discoveredReleases,
    processedReleases,
    existingReleases,
    deliveryStatus,
    errors
  };
}
