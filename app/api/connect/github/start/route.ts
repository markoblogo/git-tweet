import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Build real GitHub OAuth URL and redirect.
  return NextResponse.json({
    ok: true,
    message: "GitHub OAuth start is not wired yet.",
    next: "Implement OAuth App registration and callback handler."
  });
}
