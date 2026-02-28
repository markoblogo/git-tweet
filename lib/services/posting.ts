import { PostStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { buildXClient, type XPostResult } from "@/lib/services/x-client";

export function mapXResultToPostRecord(params: {
  result: XPostResult;
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
    status: PostStatus.FAILED,
    error: [params.warning, `${params.result.code}: ${params.result.message}`].filter(Boolean).join(" | ")
  };
}

export async function postToXOrFail(params: {
  eventId: string;
  text: string;
  targetUrl: string;
  warning?: string;
  xAccessToken?: string | null;
}): Promise<void> {
  const client = buildXClient();
  const result = await client.publishPost({
    text: params.text,
    accessToken: params.xAccessToken
  });
  const mapped = mapXResultToPostRecord({
    result,
    warning: params.warning
  });

  if (mapped.status === PostStatus.FAILED) {
    await prisma.post.create({
      data: {
        eventId: params.eventId,
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
