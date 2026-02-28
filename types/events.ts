export type GitHubReleasePayload = {
  action: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    private?: boolean;
    topics?: string[];
    owner: {
      login: string;
    };
  };
  release: {
    id: number;
    tag_name: string;
    published_at: string;
    html_url: string;
    draft: boolean;
    prerelease: boolean;
  };
};

export type GitHubCreateTagPayload = {
  ref: string;
  ref_type: "tag" | "branch";
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    private?: boolean;
    topics?: string[];
    owner: {
      login: string;
    };
  };
};

export type NormalizedEvent = {
  type: "RELEASE_PUBLISHED" | "FIRST_PUBLIC_RELEASE" | "MAJOR_VERSION" | "VERSION_TAG";
  sourceKey: string;
  releaseTag?: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
};
