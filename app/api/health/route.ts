import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import packageJson from "@/package.json";

export async function GET(request: Request) {
  const checkDatabase = new URL(request.url).searchParams.get("ready") === "1";

  if (checkDatabase) {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 });
    }
  }

  return NextResponse.json({
    ok: true,
    version: packageJson.version,
    ...(checkDatabase ? { database: "ready" } : {})
  });
}
