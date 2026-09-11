import { NextResponse } from "next/server";
import { z } from "zod";
import { isCronAuthorized } from "@/lib/services/cron-auth";
import { retryFailedXRelease } from "@/lib/services/post-rerun";

const retrySchema = z.object({
  repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  releaseTag: z.string().min(1).max(100)
});

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = retrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid retry target" }, { status: 400 });
  }

  try {
    const result = await retryFailedXRelease(parsed.data);
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Retry failed" },
      { status: 500 }
    );
  }
}
