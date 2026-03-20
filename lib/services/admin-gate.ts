import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

const encoder = new TextEncoder();

export const ADMIN_COOKIE_NAME = "git_tweet_admin";
const ADMIN_COOKIE_PAYLOAD = "git-tweet-admin";

function getSubtleCrypto(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

async function signValue(secret: string, value: string): Promise<string> {
  const cryptoKey = await getSubtleCrypto().importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await getSubtleCrypto().sign("HMAC", cryptoKey, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getAdminGatePassword(): string | null {
  return process.env.ADMIN_GATE_PASSWORD || null;
}

export function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  if (nextPath === "/admin-login") {
    return "/";
  }

  return nextPath;
}

function safeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export async function buildAdminCookieValue(secret: string): Promise<string> {
  const signature = await signValue(secret, ADMIN_COOKIE_PAYLOAD);
  return `v1.${signature}`;
}

export async function isValidAdminCookie(secret: string, cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) {
    return false;
  }

  const expected = await buildAdminCookieValue(secret);
  return cookieValue === expected;
}

function readCookieFromHeader(cookieHeader: string | null, cookieName: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const prefix = `${cookieName}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }

  return undefined;
}

export function isValidAdminPassword(password: string, gatePassword: string): boolean {
  return safeEqual(password, gatePassword);
}

export async function requireAdminPageAccess(nextPath: string): Promise<void> {
  const gatePassword = getAdminGatePassword();
  if (!gatePassword) {
    return;
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminCookie(gatePassword, cookieValue)) {
    return;
  }

  redirect(`/admin-login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
}

export async function requireAdminApiAccess(request: Request): Promise<NextResponse | null> {
  const gatePassword = getAdminGatePassword();
  if (!gatePassword) {
    return null;
  }

  const cookieValue = readCookieFromHeader(request.headers.get("cookie"), ADMIN_COOKIE_NAME);
  if (await isValidAdminCookie(gatePassword, cookieValue)) {
    return null;
  }

  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}
