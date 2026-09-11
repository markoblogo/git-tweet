import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

type RuntimeEnv = Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "TOKEN_ENCRYPTION_KEY">>;

function encryptionKey(env: RuntimeEnv): Buffer | null {
  const encoded = env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!encoded) {
    return null;
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  return key;
}

export function encryptToken(value: string, env: RuntimeEnv = process.env): string {
  const key = encryptionKey(env);
  if (!key) {
    if (env.NODE_ENV === "production") {
      throw new Error("TOKEN_ENCRYPTION_KEY is required before storing OAuth tokens in production");
    }
    return value;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptToken(value: string, env: RuntimeEnv = process.env): string {
  if (!value.startsWith(PREFIX)) {
    return value;
  }

  const key = encryptionKey(env);
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required to read encrypted OAuth tokens");
  }

  const parts = value.slice(PREFIX.length).split(".");
  if (parts.length !== 3) {
    throw new Error("Encrypted OAuth token has an unsupported format");
  }

  const [ivValue, tagValue, ciphertextValue] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}
