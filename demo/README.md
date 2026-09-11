# Reproducible v0.3.1 demo

Run:

```sh
npm run preview -- \
  --event release \
  --project git-tweet \
  --tag v0.3.1 \
  --description "Self-hosted release announcements with deterministic rules, logs, and retries."
```

The committed [output](v0.3.1-preview.txt) is 167 characters, targets X and
Bluesky, and sends nothing. It exercises the same deterministic composer used
by webhook ingestion.

The live posting gate remains separate: replay a signed fixture with
`npm run replay:release`, then confirm one event and one destination row per
enabled network in `/logs`.
