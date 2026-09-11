import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "@/lib/services/token-vault";

const key = Buffer.alloc(32, 7).toString("base64");

describe("token vault", () => {
  it("encrypts and decrypts a token without retaining plaintext", () => {
    const encrypted = encryptToken("oauth-secret", { TOKEN_ENCRYPTION_KEY: key, NODE_ENV: "production" });

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain("oauth-secret");
    expect(decryptToken(encrypted, { TOKEN_ENCRYPTION_KEY: key, NODE_ENV: "production" })).toBe("oauth-secret");
  });

  it("keeps legacy plaintext readable during upgrades", () => {
    expect(decryptToken("legacy-token", { TOKEN_ENCRYPTION_KEY: key, NODE_ENV: "production" })).toBe(
      "legacy-token"
    );
  });

  it("refuses to store new plaintext tokens in production", () => {
    expect(() => encryptToken("oauth-secret", { NODE_ENV: "production" })).toThrow(
      "TOKEN_ENCRYPTION_KEY"
    );
  });

  it("rejects malformed encryption keys", () => {
    expect(() => encryptToken("oauth-secret", { TOKEN_ENCRYPTION_KEY: "short", NODE_ENV: "production" })).toThrow(
      "32-byte"
    );
  });
});
