import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { currentXConnectionMode, hasManualXCredentials } from "@/lib/services/x-connection";

describe("x-connection env behavior", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to oauth mode", () => {
    delete process.env.X_CONNECTION_MODE;
    expect(currentXConnectionMode()).toBe("oauth");
  });

  it("detects manual credentials from env", () => {
    delete process.env.X_ACCESS_TOKEN;
    expect(hasManualXCredentials()).toBe(false);

    process.env.X_ACCESS_TOKEN = "token";
    expect(hasManualXCredentials()).toBe(true);
  });
});
