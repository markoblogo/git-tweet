import { describe, expect, it } from "vitest";
import { PostStatus } from "@prisma/client";
import { mapXResultToPostRecord } from "@/lib/services/posting";

describe("mapXResultToPostRecord", () => {
  it("maps success result to POSTED", () => {
    const mapped = mapXResultToPostRecord({
      result: { ok: true, externalId: "123" },
      warning: "shortener_fallback: timeout"
    });

    expect(mapped.status).toBe(PostStatus.POSTED);
    expect(mapped.externalId).toBe("123");
    expect(mapped.error).toContain("shortener_fallback");
  });

  it("maps failure result to FAILED with taxonomy", () => {
    const mapped = mapXResultToPostRecord({
      result: { ok: false, code: "AUTH_ERROR", message: "invalid token" }
    });

    expect(mapped.status).toBe(PostStatus.FAILED);
    expect(mapped.error).toBe("AUTH_ERROR: invalid token");
  });
});
