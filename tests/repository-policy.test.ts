import { describe, expect, it } from "vitest";
import { autoActivateOwners, shouldAutoActivateRepository } from "@/lib/services/repository-policy";

describe("repository auto activation", () => {
  it("normalizes the configured owner allowlist", () => {
    expect(autoActivateOwners({ GITHUB_AUTO_ACTIVATE_OWNERS: "markoblogo, ABVX " })).toEqual(
      new Set(["markoblogo", "abvx"])
    );
  });

  it("activates only public repositories owned by an allowed account", () => {
    const env = { GITHUB_AUTO_ACTIVATE_OWNERS: "markoblogo" };
    expect(shouldAutoActivateRepository({ owner: "MarkoBlogo", isPrivate: false }, env)).toBe(true);
    expect(shouldAutoActivateRepository({ owner: "markoblogo", isPrivate: true }, env)).toBe(false);
    expect(shouldAutoActivateRepository({ owner: "someone-else", isPrivate: false }, env)).toBe(false);
  });
});
