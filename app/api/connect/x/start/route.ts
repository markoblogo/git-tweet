import { Provider } from "@prisma/client";
import { NextResponse } from "next/server";
import { buildXAuthorizeUrl } from "@/lib/services/x-oauth";
import {
  codeChallengeS256,
  createOAuthState,
  generateCodeVerifier,
  randomStateToken
} from "@/lib/services/oauth-state";
import { currentXConnectionMode } from "@/lib/services/x-connection";

export async function GET() {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const mode = currentXConnectionMode();

  if (mode === "manual_env") {
    return NextResponse.redirect(`${appUrl}/connect/x?mode=manual_env`);
  }

  if (mode !== "oauth") {
    return NextResponse.json({ ok: false, error: `Unsupported X_CONNECTION_MODE: ${mode}` }, { status: 400 });
  }

  try {
    const state = randomStateToken();
    const verifier = generateCodeVerifier();
    const challenge = codeChallengeS256(verifier);
    const redirectUri = process.env.X_REDIRECT_URI || `${appUrl}/api/connect/x/callback`;

    await createOAuthState({
      provider: Provider.X,
      state,
      codeVerifier: verifier,
      redirectUri
    });

    const authorizeUrl = buildXAuthorizeUrl({
      appUrl,
      state,
      codeChallenge: challenge
    });

    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    return NextResponse.redirect(
      `${appUrl}/connect/x?error=${encodeURIComponent(error instanceof Error ? error.message : "x_oauth_start_failed")}`
    );
  }
}
