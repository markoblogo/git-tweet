import { createHash, randomBytes } from "node:crypto";
import { Provider } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function base64url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function randomStateToken(): string {
  return base64url(randomBytes(24));
}

export function generateCodeVerifier(): string {
  return base64url(randomBytes(48));
}

export function codeChallengeS256(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export async function createOAuthState(params: {
  provider: Provider;
  state: string;
  redirectUri: string;
  codeVerifier?: string;
  ttlMinutes?: number;
}) {
  const ttlMinutes = params.ttlMinutes ?? 10;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  await prisma.oAuthState.create({
    data: {
      provider: params.provider,
      state: params.state,
      redirectUri: params.redirectUri,
      codeVerifier: params.codeVerifier,
      expiresAt
    }
  });
}

export async function consumeOAuthState(params: {
  provider: Provider;
  state: string;
}): Promise<{ ok: true; codeVerifier?: string | null; redirectUri: string } | { ok: false; reason: string }> {
  const record = await prisma.oAuthState.findUnique({
    where: { state: params.state }
  });

  if (!record) {
    return { ok: false, reason: "state_not_found" };
  }

  await prisma.oAuthState.delete({ where: { id: record.id } });

  if (record.provider !== params.provider) {
    return { ok: false, reason: "state_provider_mismatch" };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "state_expired" };
  }

  return {
    ok: true,
    codeVerifier: record.codeVerifier,
    redirectUri: record.redirectUri
  };
}
