import { describe, expect, it } from "vitest";
import { versionTagSkipReason } from "@/lib/services/github-ingestion";

describe("versionTagSkipReason", () => {
  it("skips when a matching release already exists", () => {
    expect(
      versionTagSkipReason({
        hasMatchingReleaseEvent: true,
        repoHasReleaseHistory: false
      })
    ).toBe("covered_by_release_published");
  });

  it("skips when repository already prefers release signal", () => {
    expect(
      versionTagSkipReason({
        hasMatchingReleaseEvent: false,
        repoHasReleaseHistory: true
      })
    ).toBe("repository_prefers_release_signal");
  });

  it("allows tag-only posting for repos without release history", () => {
    expect(
      versionTagSkipReason({
        hasMatchingReleaseEvent: false,
        repoHasReleaseHistory: false
      })
    ).toBeNull();
  });
});
