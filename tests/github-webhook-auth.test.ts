import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGitHubSignature } from "@/lib/services/github-webhook-auth";

function signatureFor(body: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

describe("verifyGitHubSignature", () => {
  it("returns true for valid signature", () => {
    const body = JSON.stringify({ action: "published" });
    const secret = "top-secret";

    expect(
      verifyGitHubSignature({
        rawBody: body,
        signatureHeader: signatureFor(body, secret),
        secret
      })
    ).toBe(true);
  });

  it("returns false for invalid or missing signature", () => {
    const body = "{}";

    expect(
      verifyGitHubSignature({ rawBody: body, signatureHeader: "sha256=deadbeef", secret: "secret" })
    ).toBe(false);
    expect(verifyGitHubSignature({ rawBody: body, signatureHeader: null, secret: "secret" })).toBe(false);
  });
});
