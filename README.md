# git-tweet (MVP stabilization)

git-tweet is a narrow, conservative auto-posting service that publishes only meaningful GitHub milestones to X.

## MVP scope (current)

Included:
- GitHub webhook ingestion (`release`, `create`) with signature verification (`X-Hub-Signature-256`)
- Deterministic event classification:
  - `release published`
  - `first public release`
  - `major version` (`x.0.0`, `x>=1`)
  - `version tag` (strict semver-like tags only)
- Repository activation flow (active/inactive toggle)
- Conservative dedup with explicit `SKIPPED_DUPLICATE` logs
- Optional shortener adapter with safe fallback
- Real X posting in `manual_env` mode
- Logs/history with lifecycle clarity + manual rerun for failed posts

Not included:
- OAuth polish
- LinkedIn, AI, draft mode, cron/queues, notifications, analytics, template customization, multi-user architecture

## Architecture

- Framework: Next.js (App Router, TypeScript)
- DB: Postgres + Prisma
- Integrations:
  - GitHub webhook ingestion
  - X API posting (`manual_env`)
  - Optional ABVX shortener
- Processing model:
  - webhook -> verify signature -> classify event -> persist event -> evaluate activation/policy -> dedup/skip/post -> persist post status

## Data model

Core entities:
- `User`
- `ConnectedAccount` (`GITHUB`, `X`)
- `Repository`
- `RepositorySettings`
- `Event`
- `Post`

`Post` captures operational result (`POSTED`, `FAILED`, `SKIPPED_DUPLICATE`, `SKIPPED_POLICY`) plus `targetUrl`, `error`, `externalId`.

## Local setup

1. Install deps:
```bash
npm install
```

2. Configure env:
```bash
cp .env.example .env
```

3. Generate Prisma client:
```bash
npm run db:generate
```

4. Initialize DB schema:
```bash
npm run db:migrate -- --name init
```

Fallback for internal/local environments if migration engine flow is blocked:
```bash
npm run db:push
```

5. Start app:
```bash
npm run dev
```

## DB / migration strategy

- Committed baseline migration: `prisma/migrations/20260228113000_init/migration.sql`
- Preferred path: `prisma migrate dev` for tracked schema changes
- Practical fallback (internal tool): `prisma db push` for rapid local recovery

## Repository activation flow

- Page: `/repositories`
- Each repository has explicit `Activate` / `Deactivate` toggle
- Default behavior is conservative:
  - missing settings or `isActive=false` => no posting
- API option for automation/scripts:
  - `PATCH /api/repositories/:repositoryId/activation`
  - payload: `{ "isActive": true|false }`

## Ingestion guardrails

Conservative behavior:
- Inactive/missing settings => event may be persisted but posting is skipped with `SKIPPED_POLICY`
- Duplicate source key => `SKIPPED_DUPLICATE`
- Tag covered by release event => `SKIPPED_POLICY` with reason `covered_by_release_published`
- Shortener failures never block post record creation

This gives a readable lifecycle in `/logs` even when posting is skipped.

## Webhook verification

- Uses HMAC SHA256 over raw body
- Header: `X-Hub-Signature-256`
- Secret: `GITHUB_WEBHOOK_SECRET`
- Behavior:
  - missing secret => `500`
  - invalid signature => `401`
  - invalid payload schema/json => `400`

## X integration mode

Current practical mode: `manual_env`
- `X_ACCESS_TOKEN` from env is used for real `POST /2/tweets`
- `/connect/x` shows connection status and has sync action to store credentials into `connected_accounts`

Connection modes:
- `X_CONNECTION_MODE=manual_env` (default, real posting)
- `X_CONNECTION_MODE=stub_success` (test mode)

## Shortener integration

Adapter: `lib/services/link-shortener.ts`

Behavior:
- Disabled/unconfigured/error => fallback to original repo URL
- Optional domain allowlist via `SHORTENER_PUBLIC_BASE_URL`

## Logs / operational clarity

`/logs` shows:
- event type
- repository
- source key
- post status
- post text
- URL used (`targetUrl`)
- X external id (when posted)
- error / skip reason
- lifecycle summary

## Manual rerun path (minimal)

- UI: `/logs` -> `Re-run failed post` button on `FAILED` rows
- API: `POST /api/posts/:postId/rerun`
- Rerun creates a new post attempt and keeps original failure for audit trail

## Local replay utilities

Fixtures:
- `fixtures/webhooks/release-published.json`
- `fixtures/webhooks/create-tag.json`

Scripts:
```bash
npm run replay:release
npm run replay:tag
```

These scripts sign payloads with `GITHUB_WEBHOOK_SECRET` and POST to local webhook route.

## API endpoints (current)

- `POST /api/webhooks/github`
- `GET /api/repositories`
- `PATCH /api/repositories/:repositoryId/activation`
- `GET /api/logs`
- `GET /api/connect/x/start`
- `POST /api/connect/x/manual-sync`
- `POST /api/posts/:postId/rerun`

## Env variables

Required:
- `DATABASE_URL`
- `GITHUB_WEBHOOK_SECRET`
- `X_CONNECTION_MODE`

X (`manual_env`):
- `X_ACCESS_TOKEN`
- `X_ACCOUNT_ID` (optional)
- `X_ACCOUNT_USERNAME` (optional)
- `X_API_BASE_URL` (default `https://api.x.com/2`)
- `X_HTTP_TIMEOUT_MS` (default `8000`)

Optional shortener:
- `SHORTENER_ENABLED`
- `SHORTENER_API_URL`
- `SHORTENER_API_KEY`
- `SHORTENER_TIMEOUT_MS`
- `SHORTENER_PUBLIC_BASE_URL`

## Next steps beyond this stabilization

- Full OAuth-based X connect flow
- Retry/backoff policy for transient X failures
- GitHub repository sync flow hardening
- Auth/session ownership checks
