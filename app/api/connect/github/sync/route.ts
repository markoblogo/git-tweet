import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/services/admin-gate";
import { syncGitHubRepositories } from "@/lib/services/github-client";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await syncGitHubRepositories();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "github_sync_failed" },
      { status: 400 }
    );
  }
}
