import { EventType } from "@prisma/client";

const MAX_HASHTAGS = 3;
const MAX_TAG_LENGTH = 30;

export function normalizeTopicsToHashtags(topics: string[]): string[] {
  const tags = topics
    .map((topic) => topic.toLowerCase().trim())
    .map((topic) => topic.replace(/[^a-z0-9-]/g, ""))
    .filter((topic) => topic.length > 0 && topic.length <= MAX_TAG_LENGTH)
    .filter((topic) => !topic.startsWith("private") && !topic.startsWith("internal"))
    .slice(0, MAX_HASHTAGS)
    .map((topic) => `#${topic.replace(/-/g, "")}`);

  return Array.from(new Set(tags));
}

function eventLabel(eventType: EventType, tag?: string): string {
  switch (eventType) {
    case "FIRST_PUBLIC_RELEASE":
      return "First public release";
    case "MAJOR_VERSION":
      return `${tag ?? "Major version"} released`;
    case "VERSION_TAG":
      return `${tag ?? "Version tag"} tagged`;
    case "RELEASE_PUBLISHED":
    default:
      return "New release";
  }
}

export function composeTweet(params: {
  eventType: EventType;
  projectName: string;
  repoUrl: string;
  topics: string[];
  releaseTag?: string;
}): string {
  const header = `${eventLabel(params.eventType, params.releaseTag)}: ${params.projectName}`;
  const hashtags = normalizeTopicsToHashtags(params.topics);
  const suffix = hashtags.length > 0 ? `\n${hashtags.join(" ")}` : "";

  return `${header}\n${params.repoUrl}${suffix}`;
}
