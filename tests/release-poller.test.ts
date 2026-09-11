import { describe, expect, it } from "vitest";
import { releasePollingNotBefore, selectRecentPublishedReleases } from "@/lib/services/release-poller";

const now = new Date("2026-09-11T18:00:00Z");

describe("release polling window", () => {
  it("keeps recent stable releases in chronological order", () => {
    const releases = [
      { id: 3, tag_name: "v3.0.0", published_at: "2026-09-11T17:50:00Z", html_url: "https://example/3", draft: false, prerelease: false },
      { id: 1, tag_name: "v1.0.0", published_at: "2026-09-11T16:30:00Z", html_url: "https://example/1", draft: false, prerelease: false },
      { id: 2, tag_name: "v2.0.0", published_at: "2026-09-11T17:00:00Z", html_url: "https://example/2", draft: true, prerelease: false }
    ];

    expect(selectRecentPublishedReleases(releases, now, 180).map((release) => release.id)).toEqual([1, 3]);
  });

  it("rejects old, draft, prerelease, and undated releases", () => {
    const releases = [
      { id: 1, tag_name: "v1", published_at: "2026-09-10T10:00:00Z", html_url: "https://example/1", draft: false, prerelease: false },
      { id: 2, tag_name: "v2", published_at: null, html_url: "https://example/2", draft: false, prerelease: false },
      { id: 3, tag_name: "v3", published_at: "2026-09-11T17:00:00Z", html_url: "https://example/3", draft: false, prerelease: true }
    ];

    expect(selectRecentPublishedReleases(releases, now, 180)).toEqual([]);
  });

  it("does not backfill releases before the deployment baseline", () => {
    const releases = [
      { id: 1, tag_name: "v1", published_at: "2026-09-11T17:00:00Z", html_url: "https://example/1", draft: false, prerelease: false },
      { id: 2, tag_name: "v2", published_at: "2026-09-11T17:45:00Z", html_url: "https://example/2", draft: false, prerelease: false }
    ];
    expect(
      selectRecentPublishedReleases(releases, now, 180, new Date("2026-09-11T17:30:00Z")).map(
        (release) => release.id
      )
    ).toEqual([2]);
  });

  it("validates the configured deployment baseline", () => {
    expect(releasePollingNotBefore({ GITHUB_RELEASES_NOT_BEFORE: "2026-09-11T17:30:00Z" }))
      .toEqual(new Date("2026-09-11T17:30:00Z"));
    expect(() => releasePollingNotBefore({ GITHUB_RELEASES_NOT_BEFORE: "later" })).toThrow(
      "ISO-8601"
    );
  });
});
