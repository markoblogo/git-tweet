import { NextResponse } from "next/server";
import { z } from "zod";
import { handleReleasePublished, handleTagCreated } from "@/lib/services/github-ingestion";
import { verifyGitHubSignature } from "@/lib/services/github-webhook-auth";
import type { GitHubCreateTagPayload, GitHubReleasePayload } from "@/types/events";

const releaseSchema = z.object({
  action: z.string(),
  repository: z.any(),
  release: z.any()
});

const createSchema = z.object({
  ref: z.string(),
  ref_type: z.enum(["tag", "branch"]),
  repository: z.any()
});

export async function POST(request: Request) {
  const eventType = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const isValidSignature = verifyGitHubSignature({
    rawBody,
    signatureHeader: signature,
    secret
  });

  if (!isValidSignature) {
    return NextResponse.json({ ok: false, error: "Invalid webhook signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    if (eventType === "release") {
      const parsed = releaseSchema.parse(body);
      await handleReleasePublished(parsed as GitHubReleasePayload);
      return NextResponse.json({ ok: true, accepted: "release" });
    }

    if (eventType === "create") {
      const parsed = createSchema.parse(body);
      await handleTagCreated(parsed as GitHubCreateTagPayload);
      return NextResponse.json({ ok: true, accepted: "create" });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, error: "Unsupported payload schema" }, { status: 400 });
    }

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unhandled webhook error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ignored: eventType ?? "unknown" });
}
