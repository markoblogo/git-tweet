/** Keep automatic ingestion fail-closed; manual admin actions remain available. */
export function autonomousJobsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.AUTONOMOUS_JOBS_ENABLED === "true";
}
