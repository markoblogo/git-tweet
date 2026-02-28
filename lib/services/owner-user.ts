import { prisma } from "@/lib/db/prisma";

const FALLBACK_OWNER_EMAIL = process.env.OWNER_EMAIL || "local-owner@example.com";

export async function ensureOwnerUser() {
  return prisma.user.upsert({
    where: { email: FALLBACK_OWNER_EMAIL },
    update: {},
    create: { email: FALLBACK_OWNER_EMAIL }
  });
}
