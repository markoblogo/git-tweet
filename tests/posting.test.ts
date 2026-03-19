import { describe, expect, it } from "vitest";
import { PostStatus } from "@prisma/client";
import { mapSocialResultToPostRecord } from "@/lib/services/posting";

describe("mapSocialResultToPostRecord", () => {
  it("maps success result to POSTED", () => {
    const mapped = mapSocialResultToPostRecord({
      result: { ok: true, externalId: "123" },
      warning: "shortener_fallback: timeout"
    });

    expect(mapped.status).toBe(PostStatus.POSTED);
    expect(mapped.externalId).toBe("123");
    expect(mapped.error).toContain("shortener_fallback");
  });

  it("maps failure result to FAILED with taxonomy", () => {
    const mapped = mapSocialResultToPostRecord({
      result: { ok: false, code: "AUTH_ERROR", message: "invalid token" }
    });

    expect(mapped.status).toBe(PostStatus.FAILED);
    expect(mapped.error).toBe("AUTH_ERROR: invalid token");
  });

  it("maps not configured social destinations to SKIPPED_POLICY", () => {
    const mapped = mapSocialResultToPostRecord({
      result: { ok: false, code: "NOT_CONFIGURED", message: "disabled" }
    });

    expect(mapped.status).toBe(PostStatus.SKIPPED_POLICY);
    expect(mapped.error).toBe("NOT_CONFIGURED: disabled");
  });
});
