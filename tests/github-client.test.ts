import { describe, expect, it } from "vitest";
import { isRepositorySupportedForPosting, splitRepositoriesByVisibility } from "@/lib/services/github-client";

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
