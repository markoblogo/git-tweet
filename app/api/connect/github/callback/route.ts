import { Provider } from "@prisma/client";
import { NextResponse } from "next/server";
import { consumeOAuthState } from "@/lib/services/oauth-state";
import { exchangeGitHubCode, saveGitHubConnection } from "@/lib/services/github-client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(`${appUrl}/connect/github?error=${encodeURIComponent(providerError)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/connect/github?error=missing_code_or_state`);
  }

  const consumed = await consumeOAuthState({ provider: Provider.GITHUB, state });
  if (!consumed.ok) {
    return NextResponse.redirect(`${appUrl}/connect/github?error=${consumed.reason}`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/connect/github?error=github_oauth_not_configured`);
  }

  try {
    const token = await exchangeGitHubCode({
      code,
      clientId,
      clientSecret,
      appUrl
    });
    await saveGitHubConnection({ accessToken: token.accessToken });
    return NextResponse.redirect(`${appUrl}/connect/github?connected=1`);
  } catch (error) {
    return NextResponse.redirect(
      `${appUrl}/connect/github?error=${encodeURIComponent(
        error instanceof Error ? error.message : "github_oauth_failed"
      )}`
    );
  }
}
