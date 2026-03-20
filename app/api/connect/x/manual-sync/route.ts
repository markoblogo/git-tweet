import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/services/admin-gate";
import { syncManualXConnection } from "@/lib/services/x-connection";

export async function POST(request: Request) {
  const unauthorized = await requireAdminApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  const result = await syncManualXConnection();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, providerUser: result.providerUser });
}
