import { describe, expect, it } from "vitest";
import { EventType } from "@prisma/client";
import { composeTweet, normalizeTopicsToHashtags } from "@/lib/services/tweet-composer";

describe("normalizeTopicsToHashtags", () => {
  it("keeps up to three clean tags", () => {
    const tags = normalizeTopicsToHashtags([
      "typescript",
      "dev-tools",
      "internal-ops",
      "very-very-very-very-very-very-long-topic"
    ]);

    expect(tags).toEqual(["#typescript", "#devtools"]);
  });
});

describe("composeTweet", () => {
  it("builds deterministic tweet body", () => {
    const text = composeTweet({
      eventType: EventType.RELEASE_PUBLISHED,
      projectName: "git-tweet",
      repoUrl: "https://github.com/markoblogo/git-tweet",
      topics: ["typescript", "github"]
    });

    expect(text).toContain("New release: git-tweet");
    expect(text).toContain("https://github.com/markoblogo/git-tweet");
    expect(text).toContain("#typescript #github");
  });
});
