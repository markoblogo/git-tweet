function configuredQuery(): string | null {
  const value = process.env.SOCIAL_LINK_QUERY?.trim();
  return value && value.length > 0 ? value : null;
}

export function buildSocialTargetUrl(input: string): string {
  const query = configuredQuery();
  if (!query) {
    return input;
  }

  try {
    const url = new URL(input);
    const params = new URLSearchParams(query);
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return input;
  }
}
