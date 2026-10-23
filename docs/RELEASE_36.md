# StreamAtlas 0.36.0 — Engineering Release Notes

## Baseline and scope

- Started from the complete Checkpoint 35 source. This release is cumulative; no uploaded or private data is bundled.
- **C08 promoted to LOCAL** only against the bounded Node/SQLite synthetic-demo acceptance criteria. A06, E08, E09, H04, I03 advanced but remain partial.
- Active holds now exclude media across additional user feeds, queues, favorites, watch-later, playlists, history, notifications, related page counts and interaction requests.
- Previously saved records are **not silently deleted**: they become invisible while a hold is active, and reappear after a recorded hold closure. The remote CDN/edge purge process remains outside this offline acceptance.
- Added `GET /api/studio/analytics/playback-trends?days=7|30[&ownerId=N]`, owner- or accepted analyst/editor-only. Opt-in data only, aggregated by published creator title, a five-sample privacy threshold, bounded period and non-identifying counters. No unique-viewer, qualified-time or revenue claims.
- Added `PATCH /api/studio/collaborators/{id}/role`, owner-only role changes and audit events. No upload authorization granted by role change.
- Updated Creator Studio dashboard, OpenAPI reviewed list (125 to 141 operations), and synthetic regression tests.
- Fixed hold-insensitive ingestion by diagnostic and notification services.

## Actual source verification, before packaging

- `node --test --test-concurrency=2 tests/*.test.js` — **295/295 passed** (Checkpoint 35 baseline 292 plus 3 focused integration tests).
- `npm run qa:inventory && npm run qa:release && npm run qa:release:verify` — **passed** (will rerun after final documentation updates).
- `npm run qa:browser:offline` — **passed** at desktop 1440px, tablet 820px and mobile 390px with synthetic MP4 playback.
- `npm run db:pg:check` — **passed static migration validation**; `node scripts/pg-schema-parity.js --sqlite /mnt/data/sa36-schema-disposable.sqlite` — **62/62 table parity**, not a live PostgreSQL execution.
- Clean-extraction test and integrity verification: performed separately after packaging. The generated ZIP will include full source and synthetic fixtures but no private runtime DB or credentials.

**Still blocked:** Real PostgreSQL/Maven/Docker, external CDN/rights/age/consent checks, full multi-engine browsers, production AWS, external penetration review and lawful launch acceptance. No public launch is enabled.
