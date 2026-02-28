import { NextResponse } from "next/server";
import { syncManualXConnection } from "@/lib/services/x-connection";

export async function POST() {
  const result = await syncManualXConnection();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: true, providerUser: result.providerUser });
}
