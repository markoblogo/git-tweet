# Self-hosting operations

This guide covers the Docker Compose deployment included in the repository.
For first-time configuration and provider callbacks, start with the main
[README](../README.md#self-host-with-docker).

## Start and inspect

```sh
docker compose up --build --detach --wait
docker compose ps
docker compose logs --tail=100 app
```

The app runs at `http://127.0.0.1:3000`. Two health checks are available:

- `GET /api/health` confirms that the application process responds.
- `GET /api/health?ready=1` also queries PostgreSQL and returns `503` when the
  database is unavailable.

## Back up PostgreSQL

Create a backup before upgrades or encryption-key changes:

```sh
docker compose exec -T db pg_dump -U git_tweet -d git_tweet > git-tweet.sql
```

Keep the SQL dump and `TOKEN_ENCRYPTION_KEY` in separate protected storage.
Losing the key makes encrypted GitHub and X tokens unreadable and requires
reconnecting those accounts.

## Upgrade

```sh
git pull --ff-only
docker compose up --build --detach --wait
curl --fail 'http://127.0.0.1:3000/api/health?ready=1'
```

The app container runs `prisma migrate deploy` before the server starts. Review
the changelog and back up the database before pulling a new release.

## Stop or reset

Stop containers while retaining the database:

```sh
docker compose down
```

`docker compose down --volumes` also deletes the PostgreSQL volume and all
stored repositories, events, logs, and connected-account records.

## Troubleshooting

- **App repeatedly restarts:** run `docker compose logs app`; migration,
  database, and missing-library errors appear before the Next.js startup line.
- **Readiness returns 503:** check `docker compose ps` and the `db` logs.
- **Console returns 503:** set `ADMIN_GATE_PASSWORD` in `.env.local` and restart.
- **Webhook produces no post:** confirm the repository is public and active,
  inspect `/logs`, and verify the webhook secret and subscribed event.
- **Duplicate or tag event is skipped:** inspect the recorded policy reason in
  `/logs`; release events intentionally take precedence over matching tags.
