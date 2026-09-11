import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "@/lib/services/cron-auth";

describe("cron authentication", () => {
  it("accepts the configured bearer token", () => {
    expect(isCronAuthorized("Bearer correct", { CRON_SECRET: "correct" })).toBe(true);
  });

  it("fails closed for missing configuration or a wrong token", () => {
    expect(isCronAuthorized("Bearer correct", {})).toBe(false);
    expect(isCronAuthorized("Bearer wrong", { CRON_SECRET: "correct" })).toBe(false);
    expect(isCronAuthorized(null, { CRON_SECRET: "correct" })).toBe(false);
  });
});
