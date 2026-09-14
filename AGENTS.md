# Repository guide

`git-tweet` is a single-operator Next.js service that turns signed GitHub
release webhooks into deterministic posts for X and Bluesky.

## Commands

- Install: `npm ci`
- Full gate: `npm run ci`
- Preview without posting: `npm run preview`
- Validate Prisma: `npm run db:validate`
- Apply production migrations: `npm run db:deploy`
- Self-host: `docker compose up --build`

Keep posting conservative: public repositories enabled by the ABVX ecosystem registry or the owner allowlist only,
release signals before tag fallbacks, and independent destination records.
Never log or commit OAuth tokens, app passwords, webhook secrets, admin
passwords, or token-encryption keys.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This repository uses Next.js 16.3. Read version-matched guidance under
`node_modules/next/dist/docs/` before changing framework behavior. APIs,
conventions, defaults, and file structure may differ from older versions.

<!-- END:nextjs-agent-rules -->
