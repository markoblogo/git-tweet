import { Provider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureOwnerUser } from "@/lib/services/owner-user";

export type GitHubRepoPayload = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  topics?: string[];
  owner: { login: string };
};

export function isRepositorySupportedForPosting(repo: { isPrivate: boolean }): boolean {
  return !repo.isPrivate;
}

export function splitRepositoriesByVisibility(repos: Array<{ private: boolean }>): {
  publicRepos: Array<{ private: boolean }>;
  privateRepos: Array<{ private: boolean }>;
} {
  return {
    publicRepos: repos.filter((repo) => !repo.private),
    privateRepos: repos.filter((repo) => repo.private)
  };
}

function githubApiBase(): string {
  return process.env.GITHUB_API_BASE_URL || "https://api.github.com";
}

function githubRedirectUri(appUrl: string): string {
  return process.env.GITHUB_REDIRECT_URI || `${appUrl}/api/connect/github/callback`;
}

async function githubFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${githubApiBase()}${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28"
    }
  });

  const raw = await response.text();
  let json: unknown = null;
  if (raw) {
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const message =
      typeof (json as { message?: string } | null)?.message === "string"
        ? (json as { message: string }).message
        : `GitHub API error (${response.status})`;
    throw new Error(message);
  }

  return json as T;
}

export function buildGitHubAuthorizeUrl(params: {
  clientId: string;
  state: string;
  appUrl: string;
}): string {
  const scope = process.env.GITHUB_OAUTH_SCOPE || "read:user";
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", githubRedirectUri(params.appUrl));
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeGitHubCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  appUrl: string;
}): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: githubRedirectUri(params.appUrl)
  });

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "GitHub OAuth token exchange failed");
  }

  return { accessToken: data.access_token };
}

export async function saveGitHubConnection(params: {
  accessToken: string;
}): Promise<{ providerUser: string }> {
  const userProfile = await githubFetch<{ id: number; login: string }>("/user", params.accessToken);
  const ownerUser = await ensureOwnerUser();
  const providerUser = userProfile.login;

  await prisma.connectedAccount.upsert({
    where: {
      provider_providerUser: {
        provider: Provider.GITHUB,
        providerUser
      }
    },
    update: {
      userId: ownerUser.id,
      accessToken: params.accessToken
    },
    create: {
      userId: ownerUser.id,
      provider: Provider.GITHUB,
      providerUser,
      accessToken: params.accessToken
    }
  });

  return { providerUser };
}

export async function getGitHubConnectionState() {
  const account = await prisma.connectedAccount.findFirst({
    where: { provider: Provider.GITHUB },
    orderBy: { updatedAt: "desc" }
  });

  return {
    connected: Boolean(account?.accessToken),
    account: account
      ? {
          providerUser: account.providerUser,
          updatedAt: account.updatedAt.toISOString(),
          hasAccessToken: Boolean(account.accessToken)
        }
      : null
  };
}

export async function syncGitHubRepositories(): Promise<{
  ok: boolean;
  synced: number;
  publicRepos: number;
  privateRepos: number;
}> {
  const account = await prisma.connectedAccount.findFirst({
    where: {
      provider: Provider.GITHUB,
      accessToken: { not: null }
    },
    include: { user: true },
    orderBy: { updatedAt: "desc" }
  });

  if (!account?.accessToken) {
    throw new Error("GitHub is not connected");
  }

  let page = 1;
  const repos: GitHubRepoPayload[] = [];

  while (page <= 10) {
    const chunk = await githubFetch<GitHubRepoPayload[]>(
      `/user/repos?visibility=all&affiliation=owner&per_page=100&page=${page}&sort=updated`,
      account.accessToken
    );
    repos.push(...chunk);
    if (chunk.length < 100) {
      break;
    }
    page += 1;
  }

  const partition = splitRepositoriesByVisibility(repos);
  const publicRepos = partition.publicRepos.length;
  const privateRepos = partition.privateRepos.length;

  for (const repo of repos) {
    const repoRecord = await prisma.repository.upsert({
      where: { githubId: String(repo.id) },
      update: {
        userId: account.userId,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        topics: repo.topics ?? [],
        isPrivate: repo.private
      },
      create: {
        userId: account.userId,
        githubId: String(repo.id),
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch,
        topics: repo.topics ?? [],
        isPrivate: repo.private,
        settings: {
          create: {
            isActive: false
          }
        }
      }
    });

    if (repo.private) {
      await prisma.repositorySettings.upsert({
        where: { repositoryId: repoRecord.id },
        update: { isActive: false },
        create: {
          repositoryId: repoRecord.id,
          isActive: false
        }
      });
    }
  }

  return {
    ok: true,
    synced: repos.length,
    publicRepos,
    privateRepos
  };
}
