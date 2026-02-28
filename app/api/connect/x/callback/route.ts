import { Provider } from "@prisma/client";
import { NextResponse } from "next/server";
import { consumeOAuthState } from "@/lib/services/oauth-state";
import { exchangeXOAuthCode, fetchXMe, saveXConnection } from "@/lib/services/x-oauth";

export async function GET(request: Request) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(`${appUrl}/connect/x?error=${encodeURIComponent(providerError)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/connect/x?error=missing_code_or_state`);
  }

  const consumed = await consumeOAuthState({ provider: Provider.X, state });
  if (!consumed.ok) {
    return NextResponse.redirect(`${appUrl}/connect/x?error=${consumed.reason}`);
  }

  if (!consumed.codeVerifier) {
    return NextResponse.redirect(`${appUrl}/connect/x?error=missing_code_verifier`);
  }

  try {
    const token = await exchangeXOAuthCode({
      appUrl,
      code,
      codeVerifier: consumed.codeVerifier,
      redirectUri: consumed.redirectUri
    });

    const me = await fetchXMe(token.accessToken);
    await saveXConnection({
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      providerUser: me.id
    });

    return NextResponse.redirect(`${appUrl}/connect/x?connected=1&account=${encodeURIComponent(me.username || me.id)}`);
  } catch (error) {
    return NextResponse.redirect(
      `${appUrl}/connect/x?error=${encodeURIComponent(error instanceof Error ? error.message : "x_oauth_failed")}`
    );
  }
}
