import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import packageJson from "@/package.json";

describe("health endpoint", () => {
  it("reports the running package version without requiring a database", async () => {
    const response = await GET(new Request("http://localhost/api/health"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, version: packageJson.version });
  });
});
