# v0.3.0 implementation plan

The release turns the personal prototype into a reproducible single-operator,
self-hosted release announcer.

| Gate | Deliverable | Status | Acceptance evidence |
| --- | --- | --- | --- |
| P0 Reproducibility | Fresh install, tests and build | Complete | Clean `npm ci` generates Prisma; lint, typecheck, 51 tests and production build pass without a live database |
| P1 Security | Patched dependencies, fail-closed admin, encrypted OAuth tokens | Complete | Production audit has no findings; missing secrets lock the console; token-vault regressions pass |
| P2 Self-hosting | Docker Compose, health check, production migrations | Complete in v0.3.1 | The image builds on Apple Silicon; Compose applies all migrations and reaches database readiness |
| P3 Product proof | Concise README, dry-run/replay path, measured demo | Complete | The 167-character X and Bluesky dry run is checked into `demo/` and sends no network requests |
| P4 Release | CI, upgrade notes, v0.3.0 release | Complete | v0.3.0 was published after PR and `main` checks passed; v0.3.1 closes the Docker runtime defect found during the post-release gate |

The repository remains independent from AGENTS.md Generator. Ecosystem links
belong in documentation and ABVX Lab, not in a shared runtime.
