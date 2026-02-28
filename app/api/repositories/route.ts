import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const repositories = await prisma.repository.findMany({
    include: { settings: true },
    orderBy: { fullName: "asc" }
  });

  return NextResponse.json({
    repositories: repositories.map((repo) => ({
      ...repo,
      supported: !repo.isPrivate,
      visibility: repo.isPrivate ? "private" : "public"
    }))
  });
}
