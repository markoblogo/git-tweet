import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
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
