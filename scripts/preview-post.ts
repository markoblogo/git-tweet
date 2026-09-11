import { EventType } from "@prisma/client";
import { composeTweet } from "../lib/services/tweet-composer";

function argument(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const eventNames: Record<string, EventType> = {
  release: EventType.RELEASE_PUBLISHED,
  first: EventType.FIRST_PUBLIC_RELEASE,
  major: EventType.MAJOR_VERSION,
  tag: EventType.VERSION_TAG
};

const eventName = argument("event", "release");
const eventType = eventNames[eventName];
if (!eventType) {
  throw new Error(`Unknown --event ${eventName}. Use release, first, major, or tag.`);
}

const projectName = argument("project", "git-tweet");
const releaseTag = argument("tag", "v0.3.1");
const targetUrl = argument("url", "https://github.com/markoblogo/git-tweet");
const topics = argument("topics", "opensource,devtools").split(",").filter(Boolean);
const projectBlurb = argument(
  "description",
  "Turn meaningful GitHub releases into low-noise social posts."
);

const post = composeTweet({
  eventType,
  projectName,
  projectBlurb,
  targetUrl,
  topics,
  releaseTag
});

console.log(post);
console.log(`\n---\nDry run: ${post.length} characters · destinations: X + Bluesky · no post was sent`);
