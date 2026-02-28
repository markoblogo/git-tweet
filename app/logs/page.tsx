export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { rerunFailedPost } from "@/lib/services/post-rerun";
import { revalidatePath } from "next/cache";

export default async function LogsPage() {
  async function rerunAction(formData: FormData) {
    "use server";
    const postId = String(formData.get("postId") ?? "");
    if (!postId) {
      return;
    }
    await rerunFailedPost(postId);
    revalidatePath("/logs");
  }

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
      {posts.length === 0 ? (
        <div className="card">
          <p>No deliveries yet.</p>
        </div>
      ) : (
        posts.map((post) => (
          <article className="card" key={post.id}>
            <strong>{post.status}</strong>
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
                  <small>X external id: {post.externalId}</small>
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
            {post.status === "FAILED" ? (
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
