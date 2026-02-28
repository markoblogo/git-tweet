#!/usr/bin/env node
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function parseArgs(argv) {
  const args = Object.fromEntries(
    argv
      .slice(2)
      .map((arg) => arg.split("="))
      .filter((parts) => parts.length === 2)
      .map(([key, value]) => [key.replace(/^--/, ""), value])
  );

  return {
    event: args.event ?? "release",
    fixture: args.fixture ?? "fixtures/webhooks/release-published.json",
    url: args.url ?? "http://localhost:3000/api/webhooks/github",
    secret: args.secret ?? process.env.GITHUB_WEBHOOK_SECRET
  };
}

function signatureFor(body, secret) {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

async function main() {
  const { event, fixture, url, secret } = parseArgs(process.argv);
  if (!secret) {
    throw new Error("Missing webhook secret. Pass --secret=<value> or set GITHUB_WEBHOOK_SECRET.");
  }

  const payloadPath = resolve(process.cwd(), fixture);
  const body = await readFile(payloadPath, "utf8");
  const signature = signatureFor(body, secret);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-hub-signature-256": signature
    },
    body
  });

  const text = await response.text();
  console.log(JSON.stringify({ status: response.status, body: text }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
