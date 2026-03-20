import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/services/admin-gate";
import { rerunFailedPost } from "@/lib/services/post-rerun";

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  const unauthorized = await requireAdminApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { postId } = await context.params;
  if (!postId) {
    return NextResponse.json({ ok: false, error: "postId is required" }, { status: 400 });
  }

  const result = await rerunFailedPost(postId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, postId, status: result.newStatus });
}
