export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { requireAdminPageAccess } from "@/lib/services/admin-gate";
import { rerunFailedPost } from "@/lib/services/post-rerun";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type Props = {
  searchParams?: Promise<{
    rerun?: string;
    postId?: string;
    error?: string;
  }>;
};

export default async function LogsPage({ searchParams }: Props) {
  await requireAdminPageAccess("/logs");

  async function rerunAction(formData: FormData) {
    "use server";
    const postId = String(formData.get("postId") ?? "");
    if (!postId) {
      redirect("/logs?error=missing_post_id");
    }

    const result = await rerunFailedPost(postId);
    revalidatePath("/logs");
    if (!result.ok) {
      redirect(`/logs?error=${encodeURIComponent(result.reason ?? "rerun_failed")}`);
    }

    redirect(`/logs?rerun=${result.newStatus}&postId=${encodeURIComponent(postId)}`);
  }

  const resolvedSearchParams = (await searchParams) ?? {};

  const posts = await prisma.post.findMany({
    include: {
      event: {
        include: {
          repository: true
        }
      }
    },
    take: 50,
    orderBy: {
      createdAt: "desc"
    }
  });

  const eventGroups = posts.reduce<Array<{
    eventId: string;
    eventType: string;
    repositoryFullName: string;
    sourceKey: string;
    createdAt: string;
    posts: typeof posts;
  }>>((groups, post) => {
    const existing = groups.find((group) => group.eventId === post.eventId);
    if (existing) {
      existing.posts.push(post);
      return groups;
    }

    groups.push({
      eventId: post.eventId,
      eventType: post.event.type,
      repositoryFullName: post.event.repository.fullName,
      sourceKey: post.event.sourceKey,
      createdAt: new Date(post.event.createdAt).toISOString(),
      posts: [post]
    });

    return groups;
  }, []);

  return (
    <section>
      <h1>Logs / History</h1>
      {resolvedSearchParams.rerun ? (
        <div className="card">
          <p>
            Rerun result for <code>{resolvedSearchParams.postId ?? "unknown_post"}</code>:{" "}
            <strong>{resolvedSearchParams.rerun}</strong>
          </p>
        </div>
      ) : null}
      {resolvedSearchParams.error ? (
        <div className="card">
          <p>
            Rerun error: <strong>{resolvedSearchParams.error}</strong>
          </p>
        </div>
      ) : null}
      {posts.length === 0 ? (
        <div className="card">
          <p>No deliveries yet.</p>
        </div>
      ) : (
        eventGroups.map((group) => (
          <article className="card" key={group.eventId}>
            <div className="event-group-header">
              <div>
                <strong>{group.eventType}</strong>
                <p>
                  <small>Repository: {group.repositoryFullName}</small>
                  <br />
                  <small>Source key: <code>{group.sourceKey}</code></small>
                  <br />
                  <small>Event created: {group.createdAt}</small>
                </p>
              </div>
              <span className="event-group-count">{group.posts.length} destinations</span>
            </div>

            <div className="event-destination-list">
              {group.posts.map((post) => (
                <section className="destination-entry" key={post.id}>
                  <strong>{post.destination}: {post.status}</strong>
                  <p>
                    <small>
                      Lifecycle:{" "}
                      {post.status === "POSTED"
                        ? "event accepted -> post attempted -> succeeded"
                        : post.status === "FAILED"
                          ? "event accepted -> post attempted -> failed"
                          : post.status === "SKIPPED_DUPLICATE"
                            ? "duplicate detected -> post skipped"
                            : "policy guardrail -> post skipped"}
                    </small>
                  </p>
                  <p>{post.text}</p>
                  <p>
                    <small>
                      URL used:{" "}
                      <a href={post.targetUrl} target="_blank" rel="noreferrer">
                        {post.targetUrl}
                      </a>
                    </small>
                    <br />
                    {post.externalId ? (
                      <>
                        <small>External id / uri: {post.externalId}</small>
                        <br />
                      </>
                    ) : null}
                    {post.error ? (
                      <>
                        <small>Error: {post.error}</small>
                        <br />
                      </>
                    ) : null}
                    <small>Post created: {new Date(post.createdAt).toISOString()}</small>
                  </p>
                  {post.destination !== "SYSTEM" && (post.status === "FAILED" || post.status === "POSTED") ? (
                    <form action={rerunAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <button type="submit">
                        {post.status === "POSTED" ? "Re-send post" : "Re-run failed post"}
                      </button>
                    </form>
                  ) : null}
                </section>
              ))}
            </div>
          </article>
        ))
      )}
    </section>
  );
}
