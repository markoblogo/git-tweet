const encoder = new TextEncoder();

export const ADMIN_COOKIE_NAME = "git_tweet_admin";
const ADMIN_COOKIE_PAYLOAD = "git-tweet-admin";

function getSubtleCrypto(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

async function signValue(secret: string, value: string): Promise<string> {
  const cryptoKey = await getSubtleCrypto().importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await getSubtleCrypto().sign("HMAC", cryptoKey, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getAdminGatePassword(): string | null {
  return process.env.ADMIN_GATE_PASSWORD || null;
}

export async function buildAdminCookieValue(secret: string): Promise<string> {
  const signature = await signValue(secret, ADMIN_COOKIE_PAYLOAD);
  return `v1.${signature}`;
}

export async function isValidAdminCookie(secret: string, cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) {
    return false;
  }

  const expected = await buildAdminCookieValue(secret);
  return cookieValue === expected;
}
