import { describe, expect, it } from "vitest";
import { duplicateSkipMessage, evaluateRepositoryActivation } from "@/lib/services/ingestion-guardrails";

describe("evaluateRepositoryActivation", () => {
  it("defaults to conservative inactive when settings are missing", () => {
    const result = evaluateRepositoryActivation(null);
    expect(result.canPost).toBe(false);
    expect(result.reason).toBe("repository_settings_missing");
  });

  it("returns inactive reason when repo is disabled", () => {
    const result = evaluateRepositoryActivation({ isActive: false });
    expect(result.canPost).toBe(false);
    expect(result.reason).toBe("repository_inactive");
  });

  it("allows posting when repository is active", () => {
    const result = evaluateRepositoryActivation({ isActive: true });
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
