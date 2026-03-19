import { describe, expect, it } from "vitest";
import { EventType } from "@prisma/client";
import { composeTweet, normalizeTopicsToHashtags, resolveProjectBlurb } from "@/lib/services/tweet-composer";

describe("normalizeTopicsToHashtags", () => {
  it("keeps up to two clean tags with alias mapping", () => {
    const tags = normalizeTopicsToHashtags([
      "typescript",
      "dev-tools",
      "internal-ops",
      "very-very-very-very-very-very-long-topic",
      "opensource"
    ]);

    expect(tags).toEqual(["#typescript", "#devtools"]);
  });
});

describe("composeTweet", () => {
  it("builds deterministic release tweet body with project blurb", () => {
    const text = composeTweet({
      eventType: EventType.RELEASE_PUBLISHED,
      projectName: "git-tweet",
      projectBlurb: "Auto-post meaningful GitHub releases to X (low-noise).",
      targetUrl: "https://github.com/markoblogo/git-tweet/releases/tag/v0.1.0",
      topics: ["typescript", "developer-tools"],
      releaseTag: "v0.1.0"
    });

    expect(text).toBe(
      [
        "Released v0.1.0: git-tweet",
        "Auto-post meaningful GitHub releases to X (low-noise).",
        "https://github.com/markoblogo/git-tweet/releases/tag/v0.1.0",
        "#typescript #devtools"
      ].join("\n")
    );
  });
});

describe("resolveProjectBlurb", () => {
  it("uses repo-specific overrides first", () => {
    expect(resolveProjectBlurb({ projectKey: "markoblogo/git-tweet" })).toBe(
      "Auto-post meaningful GitHub releases to X (low-noise)."
    );
  });

  it("falls back to sanitized repository description", () => {
    expect(
      resolveProjectBlurb({
        description: " Keeps AGENTS.md accurate with safe, diff-first updates. "
      })
    ).toBe("Keeps AGENTS.md accurate with safe, diff-first updates.");
  });
});
