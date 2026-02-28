import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

export function verifyGitHubSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  const { rawBody, signatureHeader, secret } = params;

  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX) || !secret) {
    return false;
  }

  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");
  const receivedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
