import { describe, expect, it } from "vitest";
import { adminGateMode, getAdminGatePassword, shouldUseSecureAdminCookie } from "@/lib/services/admin-gate";

describe("admin gate configuration", () => {
  it("fails closed in production when the password is missing", () => {
    expect(adminGateMode({ NODE_ENV: "production" })).toBe("misconfigured");
  });

  it("allows an explicit local-development bypass", () => {
    expect(adminGateMode({ NODE_ENV: "development" })).toBe("disabled-dev");
  });

  it("uses a trimmed configured password", () => {
    const env = { NODE_ENV: "production" as const, ADMIN_GATE_PASSWORD: "  secret  " };
    expect(adminGateMode(env)).toBe("configured");
    expect(getAdminGatePassword(env)).toBe("secret");
  });

  it("marks admin cookies secure only when APP_URL uses HTTPS", () => {
    expect(shouldUseSecureAdminCookie("https://operator.example.com")).toBe(true);
    expect(shouldUseSecureAdminCookie("http://127.0.0.1:3000")).toBe(false);
  });
});
