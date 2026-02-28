import { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isMajorVersionTag, parseSemverTag } from "@/lib/events/semver";
import { evaluateRepositoryActivation, duplicateSkipMessage } from "@/lib/services/ingestion-guardrails";
import { composeTweet } from "@/lib/services/tweet-composer";
import { postToXOrFail, saveSkippedDuplicate, saveSkippedPolicy, toPrismaJson } from "@/lib/services/posting";
import { getShareableRepoUrl } from "@/lib/services/link-shortener";
import type { GitHubCreateTagPayload, GitHubReleasePayload } from "@/types/events";

async function ensureRepository(payload: {
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  topics: string[];
}) {
  const fallbackUser = await prisma.user.upsert({
    where: { email: "local-owner@example.com" },
    update: {},
    create: { email: "local-owner@example.com" }
  });

  const repo = await prisma.repository.upsert({
    where: { githubId: payload.githubId },
    update: {
      owner: payload.owner,
      name: payload.name,
      fullName: payload.fullName,
      htmlUrl: payload.htmlUrl,
      topics: payload.topics
    },
    create: {
      userId: fallbackUser.id,
      githubId: payload.githubId,
      owner: payload.owner,
      name: payload.name,
      fullName: payload.fullName,
      htmlUrl: payload.htmlUrl,
      topics: payload.topics,
      defaultBranch: "main",
      settings: {
        create: {
          isActive: false
        }
      }
    },
    include: {
      user: {
        include: {
          connectedAccounts: true
        }
      },
      settings: true
    }
  });

  return repo;
}

async function emitEvent(params: {
  repositoryId: string;
  type: EventType;
  sourceKey: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
  releaseTag?: string;
}) {
  const existing = await prisma.event.findUnique({
    where: { sourceKey: params.sourceKey },
    select: { id: true }
  });
  if (existing) {
    return { skipped: true as const, eventId: existing.id };
  }

  const event = await prisma.event.create({
    data: {
      repositoryId: params.repositoryId,
      type: params.type,
      sourceKey: params.sourceKey,
      occurredAt: params.occurredAt,
      payload: toPrismaJson(params.payload),
      releaseTag: params.releaseTag
    }
  });

  return { skipped: false as const, eventId: event.id };
}

async function composeAndPost(params: {
  eventId: string;
  eventType: EventType;
  projectName: string;
  repoUrl: string;
  topics: string[];
  releaseTag?: string;
  xAccessToken?: string | null;
}) {
  const shareable = await getShareableRepoUrl(params.repoUrl);
  const targetUrl = shareable.url;
  const warning =
    shareable.error && shareable.provider === "abvx-shortener"
      ? `shortener_fallback: ${shareable.error}`
      : undefined;

  const tweet = composeTweet({
    eventType: params.eventType,
    projectName: params.projectName,
    repoUrl: targetUrl,
    topics: params.topics,
    releaseTag: params.releaseTag
  });

  await postToXOrFail({
    eventId: params.eventId,
    text: tweet,
    targetUrl,
    warning,
    xAccessToken: params.xAccessToken
  });
}

function latestXAccessToken(
  accounts: Array<{ provider: string; accessToken: string | null; updatedAt: Date }>
): string | null | undefined {
  const xAccounts = accounts
    .filter((account) => account.provider === "X")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return xAccounts[0]?.accessToken;
}

export async function handleReleasePublished(payload: GitHubReleasePayload): Promise<void> {
  if (payload.action !== "published" || payload.release.draft || payload.release.prerelease) {
    return;
  }

  const repo = await ensureRepository({
    githubId: String(payload.repository.id),
    owner: payload.repository.owner.login,
    name: payload.repository.name,
    fullName: payload.repository.full_name,
    htmlUrl: payload.repository.html_url,
    topics: payload.repository.topics ?? []
  });

  if (!repo.settings?.isActive) {
    return;
  }

  const releaseTag = payload.release.tag_name;
  const occurredAt = new Date(payload.release.published_at);
  const sourceKey = `gh:release:${payload.release.id}:published`;

  const base = await emitEvent({
    repositoryId: repo.id,
    type: EventType.RELEASE_PUBLISHED,
    sourceKey,
    occurredAt,
    payload,
    releaseTag
  });

  if (base.skipped) {
    await saveSkippedDuplicate(
      base.eventId,
      duplicateSkipMessage(sourceKey),
      repo.htmlUrl
    );
    return;
  }

  const activation = evaluateRepositoryActivation(repo.settings);
  if (!activation.canPost) {
    await saveSkippedPolicy({
      eventId: base.eventId,
      text: `Release event skipped for ${repo.fullName}`,
      targetUrl: repo.htmlUrl,
      reason: activation.reason ?? "repository_not_eligible_for_posting"
    });
    return;
  }

  const xAccessToken = latestXAccessToken(repo.user.connectedAccounts);
  await composeAndPost({
    eventId: base.eventId,
    eventType: EventType.RELEASE_PUBLISHED,
    projectName: repo.name,
    repoUrl: repo.htmlUrl,
    topics: repo.topics,
    releaseTag,
    xAccessToken
  });

  const releaseCount = await prisma.event.count({
    where: {
      repositoryId: repo.id,
      type: EventType.RELEASE_PUBLISHED
    }
  });

  if (releaseCount === 1) {
    const firstSourceKey = `gh:repo:${payload.repository.id}:first_public_release`;
    const first = await emitEvent({
      repositoryId: repo.id,
      type: EventType.FIRST_PUBLIC_RELEASE,
      sourceKey: firstSourceKey,
      occurredAt,
      payload,
      releaseTag
    });

    if (first.skipped) {
      await saveSkippedDuplicate(first.eventId, duplicateSkipMessage(firstSourceKey), repo.htmlUrl);
    } else {
      const xAccessToken = latestXAccessToken(repo.user.connectedAccounts);
      await composeAndPost({
        eventId: first.eventId,
        eventType: EventType.FIRST_PUBLIC_RELEASE,
        projectName: repo.name,
        repoUrl: repo.htmlUrl,
        topics: repo.topics,
        releaseTag,
        xAccessToken
      });
    }
  }

  if (isMajorVersionTag(releaseTag)) {
    const majorSourceKey = `gh:repo:${payload.repository.id}:major:${releaseTag}`;
    const major = await emitEvent({
      repositoryId: repo.id,
      type: EventType.MAJOR_VERSION,
      sourceKey: majorSourceKey,
      occurredAt,
      payload,
      releaseTag
    });

    if (major.skipped) {
      await saveSkippedDuplicate(major.eventId, duplicateSkipMessage(majorSourceKey), repo.htmlUrl);
    } else {
      const xAccessToken = latestXAccessToken(repo.user.connectedAccounts);
      await composeAndPost({
        eventId: major.eventId,
        eventType: EventType.MAJOR_VERSION,
        projectName: repo.name,
        repoUrl: repo.htmlUrl,
        topics: repo.topics,
        releaseTag,
        xAccessToken
      });
    }
  }
}

export async function handleTagCreated(payload: GitHubCreateTagPayload): Promise<void> {
  if (payload.ref_type !== "tag") {
    return;
  }

  const semver = parseSemverTag(payload.ref);
  if (!semver) {
    return;
  }

  const repo = await ensureRepository({
    githubId: String(payload.repository.id),
    owner: payload.repository.owner.login,
    name: payload.repository.name,
    fullName: payload.repository.full_name,
    htmlUrl: payload.repository.html_url,
    topics: payload.repository.topics ?? []
  });

  // Conservative policy: if release event already exists for same semver tag, skip VERSION_TAG post.
  const hasReleaseEvent = await prisma.event.findFirst({
    where: {
      repositoryId: repo.id,
      type: EventType.RELEASE_PUBLISHED,
      releaseTag: payload.ref
    },
    select: { id: true }
  });

  if (hasReleaseEvent) {
    await saveSkippedPolicy({
      eventId: hasReleaseEvent.id,
      text: `Tag event skipped for ${repo.fullName}`,
      targetUrl: repo.htmlUrl,
      reason: "covered_by_release_published"
    });
    return;
  }

  const sourceKey = `gh:repo:${payload.repository.id}:tag:${semver.normalized}`;
  const created = await emitEvent({
    repositoryId: repo.id,
    type: EventType.VERSION_TAG,
    sourceKey,
    occurredAt: new Date(),
    payload,
    releaseTag: payload.ref
  });

  if (created.skipped) {
    await saveSkippedDuplicate(created.eventId, duplicateSkipMessage(sourceKey), repo.htmlUrl);
    return;
  }

  const activation = evaluateRepositoryActivation(repo.settings);
  if (!activation.canPost) {
    await saveSkippedPolicy({
      eventId: created.eventId,
      text: `Version tag skipped for ${repo.fullName}`,
      targetUrl: repo.htmlUrl,
      reason: activation.reason ?? "repository_not_eligible_for_posting"
    });
    return;
  }

  const xAccessToken = latestXAccessToken(repo.user.connectedAccounts);
  await composeAndPost({
    eventId: created.eventId,
    eventType: EventType.VERSION_TAG,
    projectName: repo.name,
    repoUrl: repo.htmlUrl,
    topics: repo.topics,
    releaseTag: payload.ref,
    xAccessToken
  });
}
