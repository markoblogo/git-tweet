import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/services/admin-gate";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  const posts = await prisma.post.findMany({
    include: {
      event: {
        include: {
          repository: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return NextResponse.json({ posts });
}
