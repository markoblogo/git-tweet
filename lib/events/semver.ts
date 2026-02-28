export type Semver = {
  major: number;
  minor: number;
  patch: number;
  raw: string;
  normalized: string;
};

const SEMVER_TAG_RE = /^v?(\d+)\.(\d+)\.(\d+)$/;

export function parseSemverTag(tag: string): Semver | null {
  const match = SEMVER_TAG_RE.exec(tag.trim());
  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  return {
    major,
    minor,
    patch,
    raw: tag,
    normalized: `${major}.${minor}.${patch}`
  };
}

export function isMajorVersionTag(tag: string): boolean {
  const semver = parseSemverTag(tag);
  if (!semver) {
    return false;
  }

  return semver.major >= 1 && semver.minor === 0 && semver.patch === 0;
}
