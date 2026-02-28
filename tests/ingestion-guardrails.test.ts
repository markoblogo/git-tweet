import { describe, expect, it } from "vitest";
import { duplicateSkipMessage, evaluateRepositoryActivation } from "@/lib/services/ingestion-guardrails";

describe("evaluateRepositoryActivation", () => {
  it("marks private repositories as unsupported", () => {
    const result = evaluateRepositoryActivation({
      isPrivate: true,
      settings: { isActive: true }
    });
    expect(result.canPost).toBe(false);
    expect(result.reason).toBe("repository_private_unsupported");
  });

  it("defaults to conservative inactive when settings are missing", () => {
    const result = evaluateRepositoryActivation({ isPrivate: false, settings: null });
    expect(result.canPost).toBe(false);
    expect(result.reason).toBe("repository_settings_missing");
  });

  it("returns inactive reason when repo is disabled", () => {
    const result = evaluateRepositoryActivation({ isPrivate: false, settings: { isActive: false } });
    expect(result.canPost).toBe(false);
    expect(result.reason).toBe("repository_inactive");
  });

  it("allows posting when repository is public and active", () => {
    const result = evaluateRepositoryActivation({ isPrivate: false, settings: { isActive: true } });
    expect(result.canPost).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe("duplicateSkipMessage", () => {
  it("produces deterministic duplicate message", () => {
    expect(duplicateSkipMessage("gh:release:10:published")).toBe(
      "Duplicate event skipped: gh:release:10:published"
    );
  });
});
