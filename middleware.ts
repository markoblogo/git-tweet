import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "git_tweet_admin";
const ADMIN_COOKIE_PAYLOAD = "git-tweet-admin";
const encoder = new TextEncoder();

const PUBLIC_PATH_PREFIXES = ["/_next/", "/assets/"];
const PUBLIC_PATHS = new Set([
  "/admin-login",
  "/api/admin-login",
  "/api/webhooks/github",
  "/favicon.ico"
]);

async function signValue(secret: string, value: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isValidAdminCookie(secret: string, cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) {
    return false;
  }

  const expected = `v1.${await signValue(secret, ADMIN_COOKIE_PAYLOAD)}`;
  return cookieValue === expected;
}

export async function middleware(request: NextRequest) {
  const gatePassword = process.env.ADMIN_GATE_PASSWORD || null;
  if (!gatePassword) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await isValidAdminCookie(gatePassword, cookieValue)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin-login", request.url);
  const nextPath = pathname === "/" ? "/" : `${pathname}${search}`;
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
