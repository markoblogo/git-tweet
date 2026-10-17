import { describe, expect, it } from "vitest";
import { assertReplayAccepted } from "../scripts/replay-response.mjs";

describe("webhook replay result", () => {
  it.each(["release", "create"])("accepts an acknowledged %s handler", event => {
    expect(() => assertReplayAccepted(200, JSON.stringify({ ok: true, accepted: event }), event)).not.toThrow();
  });
  it("fails visibly when autonomous processing is paused", () => {
    expect(() => assertReplayAccepted(200, JSON.stringify({ ok: true, paused: true }), "release")).toThrow("ingestion did not run");
  });
  it.each([401, 500])("fails for HTTP %s", status => {
    expect(() => assertReplayAccepted(status, '{}', "release")).toThrow(`HTTP ${status}`);
  });
  it.each([{ ok: true, ignored: "release" }, { ok: false }, { ok: true, accepted: "create" }])("rejects an unaccepted fixture", body => {
    expect(() => assertReplayAccepted(200, JSON.stringify(body), "release")).toThrow("not accepted");
  });
});
