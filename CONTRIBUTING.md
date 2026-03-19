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
   npm install
   ```
2. Configure env:
   ```bash
   cp .env.example .env.local
   ```
3. Run database migrations:
   ```bash
   npm run db:generate
   npm run db:migrate -- --name init
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Tests and quality checks

Please ensure these pass before submitting:

```bash
npm run lint
npm test
npm run build
```

## Security notes

- Never commit secrets (tokens, OAuth client secrets, webhook secrets).
- For local end-to-end testing with real GitHub events, use a tunnel (ngrok/cloudflared).
- If you find a security issue, please report it privately (open a minimal issue without sensitive details).

## License

By contributing, you agree that your contributions will be licensed under the project's license (MIT).
