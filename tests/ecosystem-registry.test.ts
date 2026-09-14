import { describe, expect, it } from "vitest";
import { releaseSocialRepositories } from "@/lib/services/ecosystem-registry";

describe("ABVX ecosystem release policy", () => {
  it("selects only public repositories explicitly enabled for release social", () => {
    expect(releaseSocialRepositories({
      kind: "ABVXEcosystemRegistry",
      nodes: [
        { repository: "markoblogo/alpha", visibility: "public", propagation: { releaseSocial: true } },
        { repository: "markoblogo/beta", visibility: "public", propagation: { releaseSocial: false } },
        { repository: "markoblogo/private", visibility: "private", propagation: { releaseSocial: true } }
      ]
    })).toEqual(new Set(["markoblogo/alpha"]));
  });

  it("rejects an unexpected registry shape", () => {
    expect(() => releaseSocialRepositories({ kind: "Other", nodes: [] })).toThrow(
      "ABVXEcosystemRegistry"
    );
  });
});
