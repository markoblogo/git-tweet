import { EventType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isMajorVersionTag, parseSemverTag } from "@/lib/events/semver";
import { evaluateRepositoryActivation, duplicateSkipMessage } from "@/lib/services/ingestion-guardrails";
import { composeTweet, resolveProjectBlurb } from "@/lib/services/tweet-composer";
import { postToBluesky, postToXOrFail, saveSkippedDuplicate, saveSkippedPolicy, toPrismaJson } from "@/lib/services/posting";
import { getShareableRepoUrl } from "@/lib/services/link-shortener";
import type { GitHubCreateTagPayload, GitHubReleasePayload } from "@/types/events";

async function ensureRepository(payload: {
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  topics: string[];
  isPrivate: boolean;
}) {
  const fallbackUser = await prisma.user.upsert({
    where: { email: "local-owner@example.com" },
    update: {},
    create: { email: "local-owner@example.com" }
  });

  const existing = await prisma.repository.findFirst({
    where: {
      OR: [
        { githubId: payload.githubId },
        { fullName: payload.fullName }
      ]
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

  if (existing) {
    return prisma.repository.update({
      where: { id: existing.id },
      data: {
        githubId: payload.githubId,
        owner: payload.owner,
        name: payload.name,
        fullName: payload.fullName,
        htmlUrl: payload.htmlUrl,
        topics: payload.topics,
        isPrivate: payload.isPrivate
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
  }

  return prisma.repository.create({
    data: {
      userId: fallbackUser.id,
      githubId: payload.githubId,
      owner: payload.owner,
      name: payload.name,
      fullName: payload.fullName,
      htmlUrl: payload.htmlUrl,
      topics: payload.topics,
      isPrivate: payload.isPrivate,
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
  projectKey?: string;
  projectDescription?: string | null;
  targetUrl: string;
  topics: string[];
  releaseTag?: string;
  xAccessToken?: string | null;
}) {
  const shareable = await getShareableRepoUrl(params.targetUrl);
  const targetUrl = shareable.url;
  const warning =
    shareable.error && shareable.provider === "abvx-shortener"
      ? `shortener_fallback: ${shareable.error}`
      : undefined;

  const tweet = composeTweet({
    eventType: params.eventType,
    projectName: params.projectName,
    projectBlurb: resolveProjectBlurb({
      projectKey: params.projectKey,
      description: params.projectDescription ?? undefined
    }),
    targetUrl,
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

  await postToBluesky({
    eventId: params.eventId,
    text: tweet,
    targetUrl,
    warning
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

function releaseEventType(params: { releaseTag: string; existingPublishedReleaseCount: number }): EventType {
  if (params.existingPublishedReleaseCount === 0) {
    return EventType.FIRST_PUBLIC_RELEASE;
  }

  if (isMajorVersionTag(params.releaseTag)) {
    return EventType.MAJOR_VERSION;
  }

  return EventType.RELEASE_PUBLISHED;
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
    topics: payload.repository.topics ?? [],
    isPrivate: payload.repository.private ?? false
  });

  if (!repo.settings?.isActive) {
    return;
  }

  const releaseTag = payload.release.tag_name;
  const occurredAt = new Date(payload.release.published_at);
  const sourceKey = `gh:release:${payload.release.id}:published`;
  const existingPublishedReleaseCount = await prisma.event.count({
    where: {
      repositoryId: repo.id,
      type: {
        in: [EventType.RELEASE_PUBLISHED, EventType.FIRST_PUBLIC_RELEASE, EventType.MAJOR_VERSION]
      }
    }
  });
  const eventType = releaseEventType({
    releaseTag,
    existingPublishedReleaseCount
  });

  const base = await emitEvent({
    repositoryId: repo.id,
    type: eventType,
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

  const activation = evaluateRepositoryActivation({
    settings: repo.settings,
    isPrivate: repo.isPrivate
  });
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
    eventType,
    projectName: repo.name,
    projectKey: repo.fullName,
    projectDescription: payload.repository.description,
    targetUrl: repo.htmlUrl,
    topics: repo.topics,
    releaseTag,
    xAccessToken
  });
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
    topics: payload.repository.topics ?? [],
    isPrivate: payload.repository.private ?? false
  });

  // Conservative policy: if release event already exists for same semver tag, skip VERSION_TAG post.
  const hasReleaseEvent = await prisma.event.findFirst({
    where: {
      repositoryId: repo.id,
      type: {
        in: [EventType.RELEASE_PUBLISHED, EventType.FIRST_PUBLIC_RELEASE, EventType.MAJOR_VERSION]
      },
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

  const activation = evaluateRepositoryActivation({
    settings: repo.settings,
    isPrivate: repo.isPrivate
  });
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
    projectKey: repo.fullName,
    projectDescription: payload.repository.description,
    targetUrl: repo.htmlUrl,
    topics: repo.topics,
    releaseTag: payload.ref,
    xAccessToken
  });
}
