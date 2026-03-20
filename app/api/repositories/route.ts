import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/services/admin-gate";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

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
