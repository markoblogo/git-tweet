import { describe, expect, it } from "vitest";
import { codeChallengeS256, generateCodeVerifier, randomStateToken } from "@/lib/services/oauth-state";

describe("oauth-state helpers", () => {
  it("creates non-empty random state token", () => {
    const state = randomStateToken();
    expect(state.length).toBeGreaterThan(10);
  });

  it("creates stable S256 challenge for a verifier", () => {
    const verifier = "abc123";
    const challenge = codeChallengeS256(verifier);
    expect(challenge).toBe("bKE9UspwyIPg8LsQHkJaiehiTeUdstI5JZOvaoQRgJA");
  });

  it("creates code verifier", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThan(20);
  });
});
