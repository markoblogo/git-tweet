export function evaluateRepositoryActivation(settings?: { isActive: boolean } | null): {
  canPost: boolean;
  reason?: string;
} {
  if (!settings) {
    return { canPost: false, reason: "repository_settings_missing" };
  }

  if (!settings.isActive) {
    return { canPost: false, reason: "repository_inactive" };
  }

  return { canPost: true };
}

export function duplicateSkipMessage(sourceKey: string): string {
  return `Duplicate event skipped: ${sourceKey}`;
}
