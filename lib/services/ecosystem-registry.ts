type EcosystemNode = {
  repository?: unknown;
  visibility?: unknown;
  propagation?: { releaseSocial?: unknown };
};

type EcosystemRegistry = {
  kind?: unknown;
  nodes?: unknown;
};

export function releaseSocialRepositories(value: EcosystemRegistry): Set<string> {
  if (value?.kind !== "ABVXEcosystemRegistry" || !Array.isArray(value.nodes)) {
    throw new Error("ABVX ecosystem endpoint must return ABVXEcosystemRegistry");
  }
  return new Set(
    (value.nodes as EcosystemNode[])
      .filter(
        (node) =>
          node.visibility === "public" &&
          node.propagation?.releaseSocial === true &&
          typeof node.repository === "string"
      )
      .map((node) => (node.repository as string).toLowerCase())
  );
}

export async function loadReleaseSocialRepositories(
  env: Record<string, string | undefined> = process.env,
  request: typeof fetch = fetch
): Promise<Set<string> | null> {
  const url = env.ABVX_ECOSYSTEM_REGISTRY_URL?.trim();
  if (!url) return null;
  const response = await request(url, {
    headers: { Accept: "application/json", "User-Agent": "git-tweet/0.4" },
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error(`ABVX ecosystem registry returned HTTP ${response.status}`);
  return releaseSocialRepositories((await response.json()) as EcosystemRegistry);
}
