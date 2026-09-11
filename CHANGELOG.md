# Changelog

## [0.3.0] - 2026-09-11

### Added

- Reproducible release-post preview with a measured, network-free demo.
- Docker Compose self-hosting, production migrations, and health/readiness checks.
- GitHub Actions CI for linting, type checks, tests, Prisma validation, build, and dependency audit.
- AES-256-GCM storage for newly saved GitHub and X OAuth tokens.

### Changed

- Upgraded the web stack to Next.js 16.3 and React 19.3.
- Reworked the README and landing page around the self-hosted release-announcement workflow.
- Production now requires an admin password and token-encryption key before the operator console can be used.

### Fixed

- Fresh installs generate Prisma Client before tests and builds.
- Database-backed pages no longer require a live database during the production build.
- Admin cookies follow the configured HTTPS application URL, so localhost Docker sessions remain usable.

[0.3.0]: https://github.com/markoblogo/git-tweet/compare/v0.2.0...v0.3.0
