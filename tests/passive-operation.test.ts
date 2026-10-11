import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { autonomousJobsEnabled } from "@/lib/services/autonomous-jobs";

const mocks = vi.hoisted(() => ({ poll: vi.fn(), release: vi.fn(), tag: vi.fn() }));
vi.mock("@/lib/services/release-poller", () => ({ pollRecentGitHubReleases: mocks.poll }));
vi.mock("@/lib/services/github-ingestion", () => ({ handleReleasePublished: mocks.release, handleTagCreated: mocks.tag }));
import { GET } from "@/app/api/cron/releases/route";
import { POST } from "@/app/api/webhooks/github/route";

beforeEach(() => {
  vi.stubEnv("AUTONOMOUS_JOBS_ENABLED", "false");
  vi.stubEnv("CRON_SECRET", "cron-test");
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", "webhook-test");
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

function webhook() {
  const body = JSON.stringify({ action: "published", repository: {}, release: {} });
  const signature = createHmac("sha256", "webhook-test").update(body).digest("hex");
  return new Request("https://example.com/api/webhooks/github", { method: "POST", body, headers: { "x-github-event": "release", "x-hub-signature-256": `sha256=${signature}` } });
}
function cron(authorization = "Bearer cron-test") {
  return new Request("https://example.com/api/cron/releases", { headers: { authorization } });
}

describe("passive operation", () => {
  it.each([undefined, "", "false", "TRUE", "1", " true "])("fails closed for flag %s", value => {
    expect(autonomousJobsEnabled({ AUTONOMOUS_JOBS_ENABLED: value })).toBe(false);
  });
  it("acknowledges authenticated calls without running any ingestion", async () => {
    expect(await (await GET(cron())).json()).toMatchObject({ ok: true, paused: true });
    expect(await (await POST(webhook())).json()).toMatchObject({ ok: true, paused: true });
    expect(mocks.poll).not.toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
    expect(mocks.tag).not.toHaveBeenCalled();
  });
  it("keeps authentication enforced while paused", async () => {
    expect((await GET(cron("Bearer wrong"))).status).toBe(401);
    expect((await POST(new Request("https://example.com/api/webhooks/github", { method: "POST", body: "{}" }))).status).toBe(401);
    expect(mocks.poll).not.toHaveBeenCalled();
    expect(mocks.release).not.toHaveBeenCalled();
  });
  it("processes only after exact explicit opt-in", async () => {
    vi.stubEnv("AUTONOMOUS_JOBS_ENABLED", "true");
    mocks.poll.mockResolvedValue({ ok: true });
    expect((await GET(cron())).status).toBe(200);
    expect((await POST(webhook())).status).toBe(200);
    expect(mocks.poll).toHaveBeenCalledTimes(1);
    expect(mocks.release).toHaveBeenCalledTimes(1);
  });
});
