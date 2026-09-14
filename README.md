<p align="center">
  <img src="assets/logo.png" alt="git-tweet logo" width="112" />
</p>

# git-tweet

**Self-hosted GitHub release announcements for X and Bluesky, with deterministic policy, deduplication, logs, and retries.**

[![CI](https://github.com/markoblogo/git-tweet/actions/workflows/ci.yml/badge.svg)](https://github.com/markoblogo/git-tweet/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/markoblogo/git-tweet)](https://github.com/markoblogo/git-tweet/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Public overview](https://git-tweet.abvx.xyz/) · [Try the preview](#preview-a-post-in-one-minute) · [Self-host](#self-host-with-docker) · [Operations](docs/operations.md)

![Release to social-post workflow](assets/og.png)

## Why it exists

Per-repository posting Actions work well for one repository and one network.
`git-tweet` is a small, single-operator hub for people who ship across several
public repositories and want one place to automate announcements, inspect
policy decisions, and retry failed deliveries.

```text
GitHub Release → signed webhook or scheduled poll → policy + dedup → X / Bluesky → delivery log
```

- public repositories only;
- public repositories from allowlisted owners can activate automatically;
- release-first rules prevent release/tag duplicates;
- each destination succeeds or fails independently;
- no AI, scheduling, commit spam, billing, or multi-user roles.

## Preview a post in one minute

Requires Node.js 20.9 or newer.

```sh
git clone https://github.com/markoblogo/git-tweet.git
cd git-tweet
npm ci
npm run preview -- --project my-project --tag v1.2.0 \
  --url https://github.com/you/my-project \
  --description "A short, factual description of the release."
```

This uses the production composer and sends nothing:

```text
Released v1.2.0: my-project
A short, factual description of the release.
https://github.com/you/my-project
#opensource #devtools
```

The committed [v0.3.1 demo](demo/v0.3.1-preview.txt) records the exact command,
167-character output, destinations, and no-send result.

## Self-host with Docker

Requires Docker Engine or Docker Desktop with Compose.

1. Create the local configuration:

   ```sh
   cp .env.example .env.local
   openssl rand -base64 32
   ```

2. Put the generated value in `TOKEN_ENCRYPTION_KEY`, choose a strong
   `ADMIN_GATE_PASSWORD`, and configure the GitHub/X/Bluesky values you use.
   The [configuration reference](docs/configuration.md) explains every group.

3. Start the application and PostgreSQL:

   ```sh
   docker compose up --build --detach --wait
   ```

4. Open `http://127.0.0.1:3000`. Readiness is available at
   `GET /api/health?ready=1`.

The app applies committed Prisma migrations before starting. The named Docker
volume retains the database between restarts. Follow logs with
`docker compose logs -f app` and stop the stack with `docker compose down`.
See the [operations guide](docs/operations.md) for backups, upgrades, health
checks, and troubleshooting.

## Local development

Start PostgreSQL separately and point `DATABASE_URL` at it, then run:

```sh
cp .env.example .env.local
npm ci
npm run db:deploy
npm run dev
```

For webhook and release testing, use a clean production build:

```sh
npm run serve:e2e
```

The operator pages are `/connect/github`, `/connect/x`, `/connect/bluesky`,
`/repositories`, and `/logs`.

## Connect GitHub

Create a GitHub OAuth App with:

- homepage: your operator `APP_URL`;
- callback: `<APP_URL>/api/connect/github/callback`;
- scope: `read:user public_repo`.

Add its client ID and secret to `.env.local`, open `/connect/github`, complete
OAuth, and sync repositories. Private repositories are visible as unsupported
and cannot be activated.

To cover every current and future public repository owned by your account, set:

```sh
GITHUB_AUTO_ACTIVATE_OWNERS="your-github-login"
GITHUB_RELEASES_NOT_BEFORE="2026-09-11T18:30:00Z"
ABVX_ECOSYSTEM_REGISTRY_URL="https://abvx.xyz/ecosystem.json"
CRON_SECRET="a-long-random-value"
```

The signed webhook remains the immediate path. `GET /api/cron/releases`,
authenticated with `Authorization: Bearer <CRON_SECRET>`, recovers new
repositories and missed deliveries. This repository includes an hourly GitHub
Actions poll and a daily Vercel Cron fallback.
Set `GITHUB_RELEASES_NOT_BEFORE` when enabling fleet coverage so old releases
are not published retroactively. Polling processes eligible releases one at a time.
When `ABVX_ECOSYSTEM_REGISTRY_URL` is configured, it is an additional fail-closed
allowlist: only public nodes with `propagation.releaseSocial=true` are eligible.
Leave it unset to retain owner-wide discovery for new repositories that have not
yet entered the ABVX ecosystem graph.

For immediate announcements, add the same webhook to each public repository:

- payload URL: `<APP_URL>/api/webhooks/github`;
- content type: `application/json`;
- secret: the same `GITHUB_WEBHOOK_SECRET`;
- events: **Releases**, plus **Branch or tag creation** only if you want tag fallback.

`APP_URL` must be the stable operator deployment. GitHub cannot send webhooks
to localhost; use ngrok or Cloudflare Tunnel for an end-to-end local test.

## Connect destinations

### X

The default `X_CONNECTION_MODE=oauth` uses an X OAuth 2.0 Web/Automated App.
Set its callback to `<APP_URL>/api/connect/x/callback` and grant read/write plus
offline access. Manual token mode remains available with
`X_CONNECTION_MODE=manual_env` and `X_ACCESS_TOKEN`.

### Bluesky

Set `BLUESKY_ENABLED=true`, `BLUESKY_HANDLE`, and a Bluesky app password in
`BLUESKY_APP_PASSWORD`. The main account password is neither required nor
recommended.

For ABVX Shortener, set `SHORTENER_ENABLED=true`, point
`SHORTENER_API_URL` to `/api/shorten`, and configure the dedicated
`SHORTENER_API_KEY` with `SHORTENER_API_KEY_ID=git-tweet`. Shortener failure
keeps the canonical GitHub URL and does not block publication.

## Post policy

Supported signals:

1. first public release;
2. major version;
3. published release;
4. semver tag, only when a release does not cover it.

Drafts, prereleases, private repositories, non-allowlisted inactive repositories, commits,
pull requests, branches, issues, and stars do not publish posts. The generated
message contains the event, project name, one-line description, stable
repository URL, and at most two normalized topic hashtags.

## Test without publishing

```sh
npm run preview
npm run replay:release
npm run replay:tag
```

Preview never writes to the database or a network. Replay signs the included
fixture with `GITHUB_WEBHOOK_SECRET` and exercises ingestion, policy, dedup,
posting adapters, and logs. A real end-to-end acceptance still requires a
public webhook URL and configured destination credentials.

## Security and upgrades

- The operator console fails closed in production when
  `ADMIN_GATE_PASSWORD` is absent.
- New GitHub and X OAuth tokens use AES-256-GCM with
  `TOKEN_ENCRYPTION_KEY`.
- Existing plaintext token records remain readable during the v0.3.0 upgrade
  and are replaced with encrypted values when the connection is saved again.
- Never rotate `TOKEN_ENCRYPTION_KEY` until stored OAuth accounts have been
  reconnected or migrated.
- Webhooks require GitHub's HMAC SHA-256 signature.
- Report vulnerabilities through GitHub private security advisories; see
  [SECURITY.md](SECURITY.md).

From v0.2.0 or v0.3.0:

```sh
git pull
npm ci
npm run db:deploy
```

Then set the two new security variables and reconnect GitHub/X once to replace
legacy plaintext tokens.

## Quality gate

```sh
npm run ci
npm audit --omit=dev --audit-level=high
```

CI verifies ESLint, TypeScript, behavior tests, Prisma schema validity, a
database-free production build, production dependency advisories, and the full
Docker Compose migration/readiness path.

## Documentation

- [Architecture and invariants](docs/architecture.md)
- [Configuration reference](docs/configuration.md)
- [Self-hosting operations](docs/operations.md)
- [Reproducible demo](demo/README.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## Product boundaries

`git-tweet` remains independent from
[AGENTS.md Generator](https://github.com/markoblogo/AGENTS.md_generator): one
publishes release announcements, while the other maintains agent-facing
repository contracts. They meet at the release workflow and are catalogued
together in [ABVX Lab](https://lab.abvx.xyz/).

The completed [v0.3.0 implementation plan](docs/implementation-plan-v0.3.0.md)
records the acceptance gates behind the current release line.

<!-- ABVX:ECOSYSTEM:BEGIN -->
## ABVX ecosystem

- [AGENTS.md_generator](https://agentsmd.abvx.xyz/) — Keeps repository guidance and machine-readable context current. Current release: `v0.5.1`.
- [abvx-shortener](https://go.abvx.xyz/) — Uses stable short links for public campaigns and QR destinations. Current release: `v0.4.0`.
- [abvx-agent-skills](https://abvx.xyz/work/abvx-agent-skills) — Uses shared, reviewable agent capabilities during maintenance. Current release: `v0.15.0`.

_This block is generated from the reviewed ABVX ecosystem registry._
<!-- ABVX:ECOSYSTEM:END -->
