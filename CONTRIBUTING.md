# Contributing

Thanks for considering contributing to **git-tweet**.

This project started as a personal workflow tool and is intentionally kept **small, conservative, and low-noise**. Contributions are welcome when they align with that philosophy.

## Principles

- **Low-noise by design**: no commit spam, no overly chatty automation.
- **Safe-by-default**: avoid changes that can cause accidental posting or unexpected behavior.
- **Predictable behavior**: prefer explicit rules and transparent logs over "magic".
- **Small scope**: avoid expanding into a full SaaS platform.

## Good contribution ideas

- Bug fixes and reliability improvements
- Better error messages and diagnostics
- Documentation improvements
- Small UX improvements that reduce friction (without adding feature bloat)
- Additional tests for edge cases
- Connector improvements that keep strict boundaries (adapters)

## Before you open a PR

1. Open an issue describing the change (unless it's a trivial typo).
2. Keep PRs small and focused.
3. Don't add new product surface area without discussing it first.

## Development setup

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Configure env:
   ```bash
   cp .env.example .env.local
   ```
3. Run database migrations:
   ```bash
   npm run db:deploy
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Tests and quality checks

Run the same application gate used by CI:

```bash
npm run ci
npm audit --omit=dev --audit-level=high
```

Changes to Docker, migrations, startup, or health checks must also pass:

```bash
docker compose up --build --detach --wait
curl --fail 'http://127.0.0.1:3000/api/health?ready=1'
docker compose down --volumes
```

## Security notes

- Never commit secrets (tokens, OAuth client secrets, webhook secrets).
- For local end-to-end testing with real GitHub events, use a tunnel (ngrok/cloudflared).
- If you find a security issue, use GitHub's private vulnerability reporting flow described in [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the project's license (MIT).
