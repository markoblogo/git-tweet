import { describe, expect, it } from "vitest";
import {
  buildGitHubAuthorizeUrl,
  isRepositorySupportedForPosting,
  splitRepositoriesByVisibility
} from "@/lib/services/github-client";

describe("isRepositorySupportedForPosting", () => {
  it("supports public repositories", () => {
    expect(isRepositorySupportedForPosting({ isPrivate: false })).toBe(true);
  });

  it("rejects private repositories", () => {
    expect(isRepositorySupportedForPosting({ isPrivate: true })).toBe(false);
  });
});

describe("splitRepositoriesByVisibility", () => {
  it("partitions public and private repositories", () => {
    const input = [{ private: false }, { private: true }, { private: false }];
    const result = splitRepositoriesByVisibility(input);
    expect(result.publicRepos).toHaveLength(2);
    expect(result.privateRepos).toHaveLength(1);
  });
});

describe("buildGitHubAuthorizeUrl", () => {
  it("requests public repository access by default", () => {
    const url = new URL(
      buildGitHubAuthorizeUrl({
        clientId: "client-id",
        state: "state-token",
        appUrl: "http://127.0.0.1:3000"
      })
    );

    expect(url.searchParams.get("scope")).toBe("read:user public_repo");
  });
});
