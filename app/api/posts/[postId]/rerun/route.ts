import { NextResponse } from "next/server";
import { rerunFailedPost } from "@/lib/services/post-rerun";

export async function POST(_request: Request, context: { params: { postId: string } }) {
  const postId = context.params.postId;
  if (!postId) {
    return NextResponse.json({ ok: false, error: "postId is required" }, { status: 400 });
  }

  const result = await rerunFailedPost(postId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, postId, status: result.newStatus });
}
