import { PostDestination, PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { publishToBluesky, publishToX } from "@/lib/services/posting";
import { latestValidXAccessToken } from "@/lib/services/x-token";

export function isRerunnableStatus(status: PostStatus): boolean {
  return status === PostStatus.FAILED || status === PostStatus.POSTED;
}

export function isRerunnableDestination(destination: PostDestination): boolean {
  return destination === PostDestination.X || destination === PostDestination.BLUESKY;
}

export async function rerunFailedPost(postId: string): Promise<{
  ok: boolean;
  reason?: string;
  newStatus?: PostStatus;
  externalId?: string;
}> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      event: {
        include: {
          repository: {
            include: {
              user: {
                include: {
                  connectedAccounts: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!post) {
    return { ok: false, reason: "post_not_found" };
  }

  if (!isRerunnableStatus(post.status)) {
    return { ok: false, reason: "post_is_not_rerunnable" };
  }

  if (!isRerunnableDestination(post.destination)) {
    return { ok: false, reason: "post_destination_is_not_rerunnable" };
  }

  const mapped =
    post.destination === PostDestination.X
      ? await publishToX({
          text: post.text,
          warning: `${post.status === PostStatus.POSTED ? "manual_resend_from" : "manual_rerun_from"}:${post.id}`,
          xAccessToken: await latestValidXAccessToken(post.event.repository.user.connectedAccounts)
        })
      : await publishToBluesky({
          text: post.text,
          targetUrl: post.targetUrl,
          warning: `${post.status === PostStatus.POSTED ? "manual_resend_from" : "manual_rerun_from"}:${post.id}`
        });

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: mapped.status,
      externalId: mapped.externalId ?? null,
      error: mapped.error ?? null
    }
  });

  return {
    ok: true,
    newStatus: mapped.status,
    externalId: mapped.externalId
  };
}

export async function retryFailedXRelease(params: {
  repository: string;
  releaseTag: string;
}): Promise<{
  ok: boolean;
  reason?: string;
  postId?: string;
  newStatus?: PostStatus;
}> {
  const post = await prisma.post.findFirst({
    where: {
      destination: PostDestination.X,
      status: PostStatus.FAILED,
      event: {
        releaseTag: params.releaseTag,
        repository: { fullName: params.repository }
      }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });
  if (!post) return { ok: false, reason: "failed_x_post_not_found" };

  const result = await rerunFailedPost(post.id);
  return {
    ok: result.ok,
    reason: result.reason,
    postId: post.id,
    newStatus: result.newStatus
  };
}
