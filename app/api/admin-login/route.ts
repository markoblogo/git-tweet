import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  buildAdminCookieValue,
  getAdminGatePassword,
  isValidAdminPassword,
  sanitizeNextPath
} from "@/lib/services/admin-gate";

export async function POST(request: Request) {
  const gatePassword = getAdminGatePassword();
  if (!gatePassword) {
    return NextResponse.json({ ok: false, error: "ADMIN_GATE_PASSWORD is not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeNextPath(formData.get("next")?.toString() ?? null);
  const appUrl = process.env.APP_URL || "http://127.0.0.1:3000";

  if (!isValidAdminPassword(password, gatePassword)) {
    return NextResponse.redirect(`${appUrl}/admin-login?error=invalid_password&next=${encodeURIComponent(nextPath)}`);
  }

  const response = NextResponse.redirect(`${appUrl}${nextPath}`);
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: await buildAdminCookieValue(gatePassword),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return response;
}
