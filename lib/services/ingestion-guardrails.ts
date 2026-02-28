export function evaluateRepositoryActivation(params: {
  settings?: { isActive: boolean } | null;
  isPrivate: boolean;
}): {
  canPost: boolean;
  reason?: string;
} {
  if (params.isPrivate) {
    return { canPost: false, reason: "repository_private_unsupported" };
  }

  if (!params.settings) {
    return { canPost: false, reason: "repository_settings_missing" };
  }

  if (!params.settings.isActive) {
    return { canPost: false, reason: "repository_inactive" };
  }

  return { canPost: true };
}

export function duplicateSkipMessage(sourceKey: string): string {
  return `Duplicate event skipped: ${sourceKey}`;
}
