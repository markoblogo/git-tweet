import { describe, expect, it } from "vitest";
import { isMajorVersionTag, parseSemverTag } from "@/lib/events/semver";

describe("parseSemverTag", () => {
  it("parses semver-like tags", () => {
    expect(parseSemverTag("v2.0.0")?.normalized).toBe("2.0.0");
    expect(parseSemverTag("1.2.3")?.normalized).toBe("1.2.3");
  });

  it("rejects non-semver tags", () => {
    expect(parseSemverTag("release-1")).toBeNull();
    expect(parseSemverTag("v1.2")).toBeNull();
  });
});

describe("isMajorVersionTag", () => {
  it("returns true for x.0.0 where x>=1", () => {
    expect(isMajorVersionTag("v1.0.0")).toBe(true);
    expect(isMajorVersionTag("2.0.0")).toBe(true);
  });

  it("returns false for non-major tags", () => {
    expect(isMajorVersionTag("2.1.0")).toBe(false);
    expect(isMajorVersionTag("v0.0.1")).toBe(false);
  });
});
