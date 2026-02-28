import { Buffer } from "node:buffer";
import { Provider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ensureOwnerUser } from "@/lib/services/owner-user";

function xRedirectUri(appUrl: string): string {
  return process.env.X_REDIRECT_URI || `${appUrl}/api/connect/x/callback`;
}

function xClientId(): string {
  const id = process.env.X_CLIENT_ID;
  if (!id) {
    throw new Error("X_CLIENT_ID is not configured");
  }
  return id;
}

function xClientSecret(): string | undefined {
  return process.env.X_CLIENT_SECRET || undefined;
}

function xApiBase(): string {
  return process.env.X_API_BASE_URL || "https://api.x.com/2";
}

function xAuthorizeBase(): string {
  return process.env.X_AUTHORIZE_BASE_URL || "https://x.com/i/oauth2/authorize";
}

export function buildXAuthorizeUrl(params: {
  appUrl: string;
  state: string;
  codeChallenge: string;
}): string {
  const scope = process.env.X_OAUTH_SCOPE || "tweet.read tweet.write users.read offline.access";
  const url = new URL(xAuthorizeBase());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", xClientId());
  url.searchParams.set("redirect_uri", xRedirectUri(params.appUrl));
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeXOAuthCode(params: {
  appUrl: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    client_id: xClientId(),
    redirect_uri: params.redirectUri || xRedirectUri(params.appUrl),
    code_verifier: params.codeVerifier
  });

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded"
  };

  const secret = xClientSecret();
  if (secret) {
    headers.authorization = `Basic ${Buffer.from(`${xClientId()}:${secret}`).toString("base64")}`;
  }

  const response = await fetch(`${xApiBase()}/oauth2/token`, {
    method: "POST",
    headers,
    body: body.toString()
  });

  const raw = await response.text();
  let json: unknown = null;
  if (raw) {
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const msg =
      typeof (json as { error_description?: string } | null)?.error_description === "string"
        ? (json as { error_description: string }).error_description
        : `X OAuth token exchange failed (${response.status})`;
    throw new Error(msg);
  }

  const payload = json as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error("X OAuth response missing access_token");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: payload.expires_in
  };
}

export async function fetchXMe(accessToken: string): Promise<{ id: string; username?: string }> {
  const response = await fetch(`${xApiBase()}/users/me`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  const raw = await response.text();
  let json: unknown = null;
  if (raw) {
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    throw new Error(`X /users/me failed (${response.status})`);
  }

  const data = (json as { data?: { id?: string; username?: string } } | null)?.data;
  if (!data?.id) {
    throw new Error("X /users/me response missing user id");
  }

  return {
    id: data.id,
    username: data.username
  };
}

export async function saveXConnection(params: {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  providerUser: string;
}): Promise<void> {
  const ownerUser = await ensureOwnerUser();

  await prisma.connectedAccount.upsert({
    where: {
      provider_providerUser: {
        provider: Provider.X,
        providerUser: params.providerUser
      }
    },
    update: {
      userId: ownerUser.id,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresIn ? new Date(Date.now() + params.expiresIn * 1000) : null
    },
    create: {
      userId: ownerUser.id,
      provider: Provider.X,
      providerUser: params.providerUser,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresIn ? new Date(Date.now() + params.expiresIn * 1000) : null
    }
  });
}
