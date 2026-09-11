<p align="center">
  <img src="assets/logo.png" alt="git-tweet logo" width="112" />
</p>

# git-tweet

**Publish meaningful GitHub releases to X and Bluesky—with deterministic rules, deduplication, logs, and retries.**

[![CI](https://github.com/markoblogo/git-tweet/actions/workflows/ci.yml/badge.svg)](https://github.com/markoblogo/git-tweet/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/markoblogo/git-tweet)](https://github.com/markoblogo/git-tweet/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Public overview](https://git-tweet.abvx.xyz/) · [Reproducible demo](demo/README.md) · [Post policy](#post-policy) · [Self-host](#self-host-with-docker)

![Release to social-post workflow](assets/og.png)

## Why it exists

Per-repository posting Actions are useful when one workflow and one network are
enough. `git-tweet` is a small, single-operator hub for people who ship across
several repositories and need one place to see policy decisions, duplicates,
failures, and manual retries.

```text
GitHub Release → signed webhook → policy + dedup → X / Bluesky → delivery log
```

- public repositories only;
- newly discovered repositories stay inactive;
- release-first rules prevent release/tag duplicates;
- each destination succeeds or fails independently;
- no AI, scheduling, commit spam, billing, or multi-user roles.

## Preview a post in one minute

Requires Node.js 20.9 or newer.

```sh
npm install
npm run preview -- --project my-project --tag v1.2.0 \
  --description "A short, factual description of the release."
```

This uses the production composer and sends nothing. The committed
[v0.3.0 example](demo/v0.3.0-preview.txt) records its measured output.

## Self-host with Docker

1. Create the local configuration:

   ```sh
   cp .env.example .env.local
   openssl rand -base64 32
   ```

2. Put the generated value in `TOKEN_ENCRYPTION_KEY`, choose a strong
   `ADMIN_GATE_PASSWORD`, and configure the GitHub/X/Bluesky values you use.

3. Start the application and PostgreSQL:

   ```sh
   docker compose up --build
   ```

4. Open `http://127.0.0.1:3000`. Readiness is available at
   `GET /api/health?ready=1`.

The container applies committed Prisma migrations before starting. The named
Docker volume retains the database between restarts.

## Local development

```sh
cp .env.example .env.local
npm install
npm run db:migrate -- --name init
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

For each repository you activate, add a GitHub webhook:

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

## Post policy

Supported signals:

1. first public release;
2. major version;
3. published release;
4. semver tag, only when a release does not cover it.

Drafts, prereleases, private repositories, inactive repositories, commits,
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

From v0.2.0:

```sh
git pull
npm install
npm run db:deploy
```

Then set the two new security variables and reconnect GitHub/X once to replace
legacy plaintext tokens.

## Quality gate

```sh
npm run ci
npm audit --omit=dev --audit-level=high
```

CI verifies ESLint, TypeScript, 51 behavior tests, Prisma schema validity, a
database-free production build, and production dependency advisories.

## Product boundaries

`git-tweet` remains independent from
[AGENTS.md Generator](https://github.com/markoblogo/AGENTS.md_generator): one
publishes release announcements, while the other maintains agent-facing
repository contracts. They meet at the release workflow and are catalogued
together in [ABVX Lab](https://lab.abvx.xyz/).

See [CONTRIBUTING.md](CONTRIBUTING.md) for development expectations and the
[v0.3.0 plan](docs/implementation-plan-v0.3.0.md) for acceptance gates.
