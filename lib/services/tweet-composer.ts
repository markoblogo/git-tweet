import { EventType } from "@prisma/client";

const MAX_HASHTAGS = 2;
const MAX_TAG_LENGTH = 18;

const PROJECT_BLURB_OVERRIDES: Record<string, string> = {
  "markoblogo/git-tweet": "Auto-post meaningful GitHub releases to X (low-noise).",
  "markoblogo/AGENTS.md_generator": "Keeps AGENTS.md accurate with safe, diff-first updates."
};

const TOPIC_ALIASES: Record<string, string | null> = {
  "dev-tools": "devtools",
  "developer-tools": "devtools",
  "developer-tooling": "devtools",
  "ai-agents": "aiagents",
  opensource: "opensource",
  "open-source": "opensource"
};

export function normalizeTopicsToHashtags(topics: string[]): string[] {
  const tags = topics
    .map((topic) => topic.toLowerCase().trim())
    .map((topic) => topic.replace(/[^a-z0-9-]/g, ""))
    .map((topic) => TOPIC_ALIASES[topic] ?? topic)
    .filter((topic): topic is string => Boolean(topic))
    .filter((topic) => topic.length > 0 && topic.length <= MAX_TAG_LENGTH)
    .filter((topic) => /^[a-z0-9-]+$/.test(topic))
    .filter((topic) => !topic.startsWith("private") && !topic.startsWith("internal"))
    .slice(0, MAX_HASHTAGS)
    .map((topic) => `#${topic.replace(/-/g, "")}`);

  return Array.from(new Set(tags));
}

function sanitizeBlurb(input: string): string {
  return input.replace(/\s+/g, " ").trim().replace(/[. ]+$/g, "").slice(0, 100);
}

export function resolveProjectBlurb(params: {
  projectKey?: string;
  description?: string;
}): string {
  const override = params.projectKey ? PROJECT_BLURB_OVERRIDES[params.projectKey] : undefined;
  if (override) {
    return override;
  }

  if (params.description) {
    const clean = sanitizeBlurb(params.description);
    if (clean.length > 0) {
      return `${clean}.`;
    }
  }

  return "Project update.";
}

function eventLabel(eventType: EventType, tag?: string): string {
  switch (eventType) {
    case "FIRST_PUBLIC_RELEASE":
      return `First public release${tag ? ` ${tag}` : ""}`;
    case "MAJOR_VERSION":
      return `Major release${tag ? ` ${tag}` : ""}`;
    case "VERSION_TAG":
      return `Tagged${tag ? ` ${tag}` : ""}`;
    case "RELEASE_PUBLISHED":
    default:
      return tag ? `Released ${tag}` : "New release";
  }
}

export function composeTweet(params: {
  eventType: EventType;
  projectName: string;
  targetUrl: string;
  topics: string[];
  projectBlurb: string;
  releaseTag?: string;
}): string {
  const header = `${eventLabel(params.eventType, params.releaseTag)}: ${params.projectName}`;
  const hashtags = normalizeTopicsToHashtags(params.topics);
  const lines = [header, params.projectBlurb, params.targetUrl];

  if (hashtags.length > 0) {
    lines.push(hashtags.join(" "));
  }

  return lines.join("\n");
}
