import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, getAdminGatePassword, isValidAdminCookie } from "@/lib/services/admin-gate";

const PUBLIC_PATH_PREFIXES = ["/_next/", "/assets/"];
const PUBLIC_PATHS = new Set([
  "/admin-login",
  "/api/admin-login",
  "/api/webhooks/github",
  "/favicon.ico"
]);

export async function middleware(request: NextRequest) {
  const gatePassword = getAdminGatePassword();
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
