import { Provider } from "@prisma/client";
import { NextResponse } from "next/server";
import { buildGitHubAuthorizeUrl } from "@/lib/services/github-client";
import { createOAuthState, randomStateToken } from "@/lib/services/oauth-state";

export async function GET() {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ ok: false, error: "GITHUB_CLIENT_ID is not configured" }, { status: 500 });
  }

  const state = randomStateToken();
  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${appUrl}/api/connect/github/callback`;

  await createOAuthState({
    provider: Provider.GITHUB,
    state,
    redirectUri
  });

  const authorizeUrl = buildGitHubAuthorizeUrl({
    clientId,
    state,
    appUrl
  });

  return NextResponse.redirect(authorizeUrl);
}
