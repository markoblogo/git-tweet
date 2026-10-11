export function assertReplayAccepted(status, text, event) {
  if (status < 200 || status >= 300) {
    throw new Error(`Webhook replay failed: HTTP ${status}`);
  }
  const result = JSON.parse(text);
  if (result.paused === true) {
    throw new Error("Webhook replay was paused; ingestion did not run. On an isolated test server, set AUTONOMOUS_JOBS_ENABLED=true, restart it, then restore false after testing.");
  }
  if (result.ok !== true || result.accepted !== event) {
    throw new Error("Webhook replay was not accepted; ingestion was not verified.");
  }
}
