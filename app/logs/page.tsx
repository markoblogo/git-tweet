export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
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
        posts.map((post) => (
          <article className="card" key={post.id}>
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
              <small>Destination: {post.destination.toLowerCase()}</small>
              <br />
              <small>Event: {post.event.type}</small>
              <br />
              <small>Repository: {post.event.repository.fullName}</small>
              <br />
              <small>Source key: <code>{post.event.sourceKey}</code></small>
              <br />
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
              <small>Created: {new Date(post.createdAt).toISOString()}</small>
            </p>
            {post.status === "FAILED" && post.destination !== "SYSTEM" ? (
              <form action={rerunAction}>
                <input type="hidden" name="postId" value={post.id} />
                <button type="submit">Re-run failed post</button>
              </form>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
