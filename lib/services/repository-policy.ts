type OwnerEnv = Record<string, string | undefined>;

export function autoActivateOwners(env: OwnerEnv = process.env): Set<string> {
  return new Set(
    (env.GITHUB_AUTO_ACTIVATE_OWNERS ?? "")
      .split(/[\s,]+/)
      .map((owner) => owner.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function shouldAutoActivateRepository(
  repository: { owner: string; isPrivate: boolean },
  env: OwnerEnv = process.env
): boolean {
  return (
    !repository.isPrivate &&
    autoActivateOwners(env).has(repository.owner.trim().toLowerCase())
  );
}
