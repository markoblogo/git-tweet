# git-tweet (Personal Workflow Stage)

git-tweet is a conservative auto-posting tool for meaningful GitHub release milestones to X.

This stage is focused on personal daily use (single-owner), not multi-user SaaS.

## Scope in this stage

Included:
- GitHub OAuth connect flow
- X OAuth connect flow (default mode)
- Repository sync from connected GitHub account
- Public/private repository distinction
- Public repositories only for posting scope
- Explicit repository activation/deactivation
- Release/tag ingestion with signature verification
- Low-noise event policy + dedup
- Optional shortener with safe fallback
- Logs/history with lifecycle clarity
- Manual rerun path for failed posts
- Local replay scripts for signed webhooks

Out of scope:
- Billing, org roles, SaaS onboarding, LinkedIn, AI, queues/cron, notifications, advanced analytics

## Architecture choices (pragmatic)

### GitHub connect choice: OAuth (not GitHub App)
- Chosen for fastest personal setup and lowest integration overhead now.
- Good fit for single-owner workflow.
- Keeps clean boundary for future migration to GitHub App if needed.

### X connect choice: OAuth 2.0 PKCE (default)
- Replaces manual_env as primary path.
- Real connect/reconnect UX with persisted connection state.
- `manual_env` is still available as explicit fallback mode only.

### New public repos policy
- Safe default: newly discovered public repos are synced as `inactive`.
- You explicitly activate only repositories you want to post from.

## Data model notes

Core entities:
- `User`
- `ConnectedAccount`
- `Repository` (`isPrivate` added)
- `RepositorySettings`
- `Event`
- `Post`
- `OAuthState` (temporary state store for OAuth callbacks)

## Environment variables

Required:
- `DATABASE_URL`
- `APP_URL`
- `GITHUB_WEBHOOK_SECRET`

GitHub OAuth:
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI` (default: `http://localhost:3000/api/connect/github/callback`)
- `GITHUB_OAUTH_SCOPE` (default: `read:user`)

X OAuth:
- `X_CONNECTION_MODE` (`oauth` default)
- `X_CLIENT_ID`
- `X_CLIENT_SECRET` (if your X app requires confidential client auth)
- `X_REDIRECT_URI` (default: `http://localhost:3000/api/connect/x/callback`)
- `X_OAUTH_SCOPE` (default: `tweet.read tweet.write users.read offline.access`)
- `X_AUTHORIZE_BASE_URL` (default: `https://x.com/i/oauth2/authorize`)
- `X_API_BASE_URL` (default: `https://api.x.com/2`)
- `X_HTTP_TIMEOUT_MS` (default: `8000`)

Manual fallback mode only:
- `X_ACCESS_TOKEN`
- `X_ACCOUNT_ID` / `X_ACCOUNT_USERNAME`

Optional shortener:
- `SHORTENER_ENABLED`
- `SHORTENER_API_URL`
- `SHORTENER_API_KEY`
- `SHORTENER_TIMEOUT_MS`
- `SHORTENER_PUBLIC_BASE_URL`

Owner mode:
- `OWNER_EMAIL` (default `local-owner@example.com`)

## Local setup

1. Install dependencies:
```bash
npm install
```

2. Configure env:
```bash
cp .env.example .env
```

3. Prisma:
```bash
npm run db:generate
npm run db:migrate -- --name init
```

4. Start app:
```bash
npm run dev
```

## Manual setup in GitHub developer settings

1. Create OAuth App in GitHub Developer Settings.
2. Set callback URL to:
- `http://localhost:3000/api/connect/github/callback`
3. Copy Client ID/Secret into `.env`.
4. Keep webhook secret in `.env` as `GITHUB_WEBHOOK_SECRET`.

## Manual setup in X developer settings

1. Create/register X app with OAuth 2.0.
2. Set callback URL to:
- `http://localhost:3000/api/connect/x/callback`
3. Ensure app scopes include at least:
- `tweet.write`, `tweet.read`, `users.read` (and optionally `offline.access`)
4. Copy Client ID (+ Secret if required) into `.env`.

## Connect flows

### Connect GitHub
- Open `/connect/github`
- Click `Connect GitHub`
- Complete OAuth
- Click `Sync repositories from GitHub`

### Connect X
- Open `/connect/x`
- Ensure `X_CONNECTION_MODE=oauth`
- Click `Connect X`
- Complete OAuth

## Repository selection flow

- Open `/repositories`
- Use filters (`public`, `private`, `active`, `inactive`)
- Activate only public repositories you want to post from
- Private repositories are shown as unsupported and cannot be activated

## API endpoints (relevant)

- `POST /api/webhooks/github`
- `GET /api/connect/github/start`
- `GET /api/connect/github/callback`
- `POST /api/connect/github/sync`
- `GET /api/connect/x/start`
- `GET /api/connect/x/callback`
- `PATCH /api/repositories/:repositoryId/activation`
- `POST /api/posts/:postId/rerun`

## Real test checklist for `git-tweet` and `AGENTS.md_generator`

1. Start app and connect GitHub + X.
2. On `/connect/github`, run repository sync.
3. On `/repositories`, activate:
- `markoblogo/git-tweet`
- `markoblogo/AGENTS.md_generator`
4. Ensure they are shown as:
- public
- supported
- active
5. Create/publish release (or semver tag + release event) in those repos.
6. Verify in `/logs`:
- event accepted
- post status `POSTED`
- X `externalId` exists
- text and target URL are correct
7. Verify actual post in X account timeline.

## Local webhook replay

Fixtures:
- `fixtures/webhooks/release-published.json`
- `fixtures/webhooks/create-tag.json`

Commands:
```bash
npm run replay:release
npm run replay:tag
```

These scripts sign payloads using `GITHUB_WEBHOOK_SECRET`.

## Reliability behavior

- Private repositories are always excluded from posting scope.
- Newly synced public repositories stay inactive until explicitly activated.
- Duplicate events are explicitly logged as `SKIPPED_DUPLICATE`.
- Policy/guardrail skips are logged as `SKIPPED_POLICY` with reason.
- Shortener failures never block post creation.

## Remaining TODO (intentionally deferred)

- Refresh-token flow for X token renewal
- Better error surface for sync/connect actions in UI
- Optional future migration from personal OAuth model to broader multi-user model
