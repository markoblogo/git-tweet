import { PostDestination, PostStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildBlueskyClient, type BlueskyPostResult } from "@/lib/services/bluesky-client";
import { buildXClient, type XPostResult } from "@/lib/services/x-client";

type SocialPostResult =
  | XPostResult
  | BlueskyPostResult;

export function mapSocialResultToPostRecord(params: {
  result: SocialPostResult;
  warning?: string;
}): { status: PostStatus; externalId?: string; error?: string } {
  if (params.result.ok) {
    return {
      status: PostStatus.POSTED,
      externalId: params.result.externalId,
      error: params.warning
    };
  }

  return {
    status: params.result.code === "NOT_CONFIGURED" ? PostStatus.SKIPPED_POLICY : PostStatus.FAILED,
    error: [params.warning, `${params.result.code}: ${params.result.message}`].filter(Boolean).join(" | ")
  };
}

export async function publishToX(params: {
  text: string;
  warning?: string;
  xAccessToken?: string | null;
}): Promise<{ status: PostStatus; externalId?: string; error?: string }> {
  const client = buildXClient();
  const result = await client.publishPost({
    text: params.text,
    accessToken: params.xAccessToken
  });

  return mapSocialResultToPostRecord({
    result,
    warning: params.warning
  });
}

export async function publishToBluesky(params: {
  text: string;
  warning?: string;
}): Promise<{ status: PostStatus; externalId?: string; error?: string }> {
  const client = buildBlueskyClient();
  const result = await client.publishPost({
    text: params.text
  });

  return mapSocialResultToPostRecord({
    result,
    warning: params.warning
  });
}

export async function postToXOrFail(params: {
  eventId: string;
  text: string;
  targetUrl: string;
  warning?: string;
  xAccessToken?: string | null;
}): Promise<void> {
  const mapped = await publishToX({
    text: params.text,
    warning: params.warning,
    xAccessToken: params.xAccessToken
  });

  if (mapped.status === PostStatus.FAILED) {
    await prisma.post.create({
      data: {
        eventId: params.eventId,
        destination: PostDestination.X,
        status: mapped.status,
        text: params.text,
        targetUrl: params.targetUrl,
        error: mapped.error
      }
    });
    return;
  }

  await prisma.post.create({
    data: {
      eventId: params.eventId,
      destination: PostDestination.X,
      status: mapped.status,
      text: params.text,
      targetUrl: params.targetUrl,
      externalId: mapped.externalId,
      error: mapped.error
    }
  });
}

export async function postToBluesky(params: {
  eventId: string;
  text: string;
  targetUrl: string;
  warning?: string;
}): Promise<void> {
  const mapped = await publishToBluesky({
    text: params.text,
    warning: params.warning
  });

  await prisma.post.create({
    data: {
      eventId: params.eventId,
      destination: PostDestination.BLUESKY,
      status: mapped.status,
      text: params.text,
      targetUrl: params.targetUrl,
      externalId: mapped.externalId,
      error: mapped.error
    }
  });
}

export async function saveSkippedDuplicate(eventId: string, text: string, targetUrl: string): Promise<void> {
  await prisma.post.create({
    data: {
      eventId,
      destination: PostDestination.SYSTEM,
      status: PostStatus.SKIPPED_DUPLICATE,
      text,
      targetUrl
    }
  });
}

export async function saveSkippedPolicy(params: {
  eventId: string;
  text: string;
  targetUrl: string;
  reason: string;
}): Promise<void> {
  await prisma.post.create({
    data: {
      eventId: params.eventId,
      destination: PostDestination.SYSTEM,
      status: PostStatus.SKIPPED_POLICY,
      text: params.text,
      targetUrl: params.targetUrl,
      error: params.reason
    }
  });
}

export function toPrismaJson(payload: Record<string, unknown>): Prisma.InputJsonValue {
  return payload as Prisma.InputJsonValue;
}
