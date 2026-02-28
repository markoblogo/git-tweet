import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const activationSchema = z.object({
  isActive: z.boolean()
});

export async function PATCH(request: Request, context: { params: { repositoryId: string } }) {
  const repositoryId = context.params.repositoryId;
  if (!repositoryId) {
    return NextResponse.json({ ok: false, error: "repositoryId is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = activationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid activation payload" }, { status: 400 });
  }

  const repo = await prisma.repository.findUnique({ where: { id: repositoryId }, select: { id: true } });
  if (!repo) {
    return NextResponse.json({ ok: false, error: "Repository not found" }, { status: 404 });
  }

  const settings = await prisma.repositorySettings.upsert({
    where: { repositoryId },
    update: { isActive: parsed.data.isActive },
    create: { repositoryId, isActive: parsed.data.isActive }
  });

  return NextResponse.json({ ok: true, repositoryId, isActive: settings.isActive });
}
