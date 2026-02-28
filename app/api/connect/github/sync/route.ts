import { NextResponse } from "next/server";
import { syncGitHubRepositories } from "@/lib/services/github-client";

export async function POST() {
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
