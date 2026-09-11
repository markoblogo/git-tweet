# v0.3.0 implementation plan

The release turns the personal prototype into a reproducible single-operator,
self-hosted release announcer.

| Gate | Deliverable | Status | Acceptance evidence |
| --- | --- | --- | --- |
| P0 Reproducibility | Fresh install, tests and build | Complete | Clean `npm ci` generates Prisma; lint, typecheck, 51 tests and production build pass without a live database |
| P1 Security | Patched dependencies, fail-closed admin, encrypted OAuth tokens | Complete | Production audit has no findings; missing secrets lock the console; token-vault regressions pass |
| P2 Self-hosting | Docker Compose, health check, production migrations | Implemented | Fresh PostgreSQL migrations and readiness passed locally; Docker runtime validation remains for release CI or a Docker host |
| P3 Product proof | Concise README, dry-run/replay path, measured demo | Complete | The 167-character X and Bluesky dry run is checked into `demo/` and sends no network requests |
| P4 Release | CI, upgrade notes, v0.3.0 release | Ready to tag | PR and `main` GitHub checks passed; changelog and upgrade notes are complete |

The repository remains independent from AGENTS.md Generator. Ecosystem links
belong in documentation and ABVX Lab, not in a shared runtime.
