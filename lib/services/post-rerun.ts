import { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { postToXOrFail } from "@/lib/services/posting";

function latestXAccessToken(
  accounts: Array<{ provider: string; accessToken: string | null; updatedAt: Date }>
): string | null | undefined {
  const xAccounts = accounts
    .filter((account) => account.provider === "X")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return xAccounts[0]?.accessToken;
}

export function isRerunnableStatus(status: PostStatus): boolean {
  return status === PostStatus.FAILED;
}

export async function rerunFailedPost(postId: string): Promise<{
  ok: boolean;
  reason?: string;
  newStatus?: PostStatus;
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
    return { ok: false, reason: "post_is_not_failed" };
  }

  const xAccessToken = latestXAccessToken(post.event.repository.user.connectedAccounts);
  await postToXOrFail({
    eventId: post.eventId,
    text: post.text,
    targetUrl: post.targetUrl,
    warning: `manual_rerun_from:${post.id}`,
    xAccessToken
  });

  return { ok: true, newStatus: PostStatus.POSTED };
}
