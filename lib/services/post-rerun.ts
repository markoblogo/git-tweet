import { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { publishToX } from "@/lib/services/posting";

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
    return { ok: false, reason: "post_is_not_failed" };
  }

  const xAccessToken = latestXAccessToken(post.event.repository.user.connectedAccounts);
  const mapped = await publishToX({
    text: post.text,
    warning: `manual_rerun_from:${post.id}`,
    xAccessToken
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
