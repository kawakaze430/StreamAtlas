# StreamAtlas Checkpoint 38: start here

This archive is the **complete cumulative source**, not a patch. Begin with `HANDOFF_START_HERE.md`, then `docs/RELEASE_38.md`, `01_OWNER_EXECUTION_PLAN.md`, `02_VERIFICATION.md`, `03_CODEX_CLOUD_ONE_SHOT.md`, and `04_NEXT_CHECKPOINT_PROMPT.md`. Older handoffs remain history, not current statuses.

Primary app: Node.js 22.16+/SQLite, FFmpeg and synthetic MP4/HLS in private local testing. Version 0.38.0 adds robust single-node upload retries and 11 documented dynamic upload operations. A cloud production launch is NOT approved.

Run: `npm run doctor`, `npm run qa:contracts:strict`, `node --test --test-concurrency=1 tests/*.test.js`, `npm run qa:browser:offline`, `npm run qa:inventory && npm run qa:release && npm run qa:release:verify`. Run `npm run db:pg:check` for static migrations only. Do not mistake it for running PostgreSQL.
