# Configuration reference

Copy `.env.example` to `.env.local`. Docker Compose reads that file when the
stack starts. Restart the app after changing a value.

## Core

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. Compose supplies its internal value automatically. |
| `APP_URL` | Yes | Stable operator URL used for redirects and OAuth callbacks. Use HTTPS outside localhost. |
| `ADMIN_GATE_PASSWORD` | Production | Password for the single-operator console. Missing production values lock the console. |
| `TOKEN_ENCRYPTION_KEY` | Production | Base64-encoded 32-byte key for GitHub and X OAuth tokens. Generate with `openssl rand -base64 32`. |
| `OWNER_EMAIL` | No | Identifier for the single local operator record. |

## GitHub

| Variable | Required | Purpose |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | To connect | OAuth App client ID. |
| `GITHUB_CLIENT_SECRET` | To connect | OAuth App client secret. |
| `GITHUB_WEBHOOK_SECRET` | To ingest | Shared secret used to verify webhook signatures. |
| `GITHUB_REDIRECT_URI` | No | Defaults to `<APP_URL>/api/connect/github/callback`. It must exactly match the OAuth App callback. |
| `GITHUB_OAUTH_SCOPE` | No | Defaults to `read:user public_repo`. |
| `GITHUB_AUTO_ACTIVATE_OWNERS` | No | Comma-separated owners whose public repositories activate automatically. Private repositories remain blocked. |
| `CRON_SECRET` | For polling | Bearer token protecting `GET /api/cron/releases`; Vercel Cron supplies it automatically. |

For the included hourly GitHub Actions poll, store the same `CRON_SECRET` as
the repository Actions secret `GIT_TWEET_CRON_SECRET`.

## X

Set `X_CONNECTION_MODE=oauth` for the browser OAuth flow or
`X_CONNECTION_MODE=manual_env` for an operator-managed access token.

| Variable | Required | Purpose |
| --- | --- | --- |
| `X_CLIENT_ID` | OAuth mode | OAuth 2.0 client ID. |
| `X_CLIENT_SECRET` | No | OAuth confidential-client secret; PKCE public clients may omit it. |
| `X_REDIRECT_URI` | No | Defaults to `<APP_URL>/api/connect/x/callback`. |
| `X_ACCESS_TOKEN` | Manual mode | Access token used when `X_CONNECTION_MODE=manual_env`. |
| `X_ACCOUNT_ID` / `X_ACCOUNT_USERNAME` | No | Label for the manually connected account. |
| `X_OAUTH_SCOPE` | No | Defaults to read, write, user, and offline-access scopes. |
| `X_API_BASE_URL`, `X_AUTHORIZE_BASE_URL` | No | Provider endpoints; keep the defaults for X. |
| `X_HTTP_TIMEOUT_MS` | No | Posting timeout; defaults to 8000 ms. |

## Bluesky

Set `BLUESKY_ENABLED=true`, then provide `BLUESKY_HANDLE` and an app password
in `BLUESKY_APP_PASSWORD`. Do not use the account's main password.
`BLUESKY_SERVICE_URL` defaults to `https://bsky.social`.

## Links and shortening

The shortener is disabled by default. When enabled, `SHORTENER_API_URL` receives
`{"url":"..."}` as JSON. `SHORTENER_API_KEY` is sent as a bearer token when
present. `SHORTENER_PUBLIC_BASE_URL` restricts accepted responses to the
expected domain, and `SHORTENER_TIMEOUT_MS` defaults to 2000 ms.

`SOCIAL_LINK_QUERY` optionally appends or replaces query parameters before
shortening, for example `utm_source=git-tweet&utm_medium=social`.
