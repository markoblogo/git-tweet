import { createHash, timingSafeEqual } from "node:crypto";

type CronEnv = Record<string, string | undefined>;

export function isCronAuthorized(
  authorization: string | null,
  env: CronEnv = process.env
): boolean {
  const secret = env.CRON_SECRET?.trim();
  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const received = authorization.slice("Bearer ".length);
  const expectedHash = createHash("sha256").update(secret).digest();
  const receivedHash = createHash("sha256").update(received).digest();
  return timingSafeEqual(expectedHash, receivedHash);
}
