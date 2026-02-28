import { NextResponse } from "next/server";
import { currentXConnectionMode } from "@/lib/services/x-connection";

export async function GET() {
  const mode = currentXConnectionMode();
  if (mode === "manual_env") {
    return NextResponse.json({
      ok: true,
      mode,
      message: "Manual env mode is active. Use /connect/x to sync credentials."
    });
  }

  return NextResponse.json({
    ok: false,
    mode,
    message: "X OAuth start is not wired yet for this mode.",
    next: "Implement X app registration and callback handler."
  }, { status: 501 });
}
