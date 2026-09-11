import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/services/cron-auth";
import { pollRecentGitHubReleases } from "@/lib/services/release-poller";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pollRecentGitHubReleases();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Release polling failed" },
      { status: 500 }
    );
  }
}
