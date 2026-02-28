import { prisma } from "@/lib/db/prisma";

export async function isDuplicateEvent(sourceKey: string): Promise<boolean> {
  const existing = await prisma.event.findUnique({
    where: { sourceKey },
    select: { id: true }
  });

  return Boolean(existing);
}
