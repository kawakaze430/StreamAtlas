# StreamAtlas v0.25.0 — Discovery and creator-workspace checkpoint

This release builds on the complete v0.24.0 archive, preserves the Node 22/SQLite runtime, and uses original synthetic media only. It **takes the next 15 canonical roadmap items D01–D10 and E01–E05 into review**, but **does not claim all 15 are complete**. The exact 117-task master roadmap is included in `docs/streamatlas-master-development-roadmap.md`. See `STATUS_25.md` for per-item acceptance status.

## New working local features

- Unified search across videos, categories, performers, sites, networks and channels, with relative canonical links.
- Admin-only aliases and duplicate candidate reports; suggestions use alias resolution, popularity ordering and bounded typo alternatives.
- SQLite FTS5 title index with insert/update/delete triggers, publication-safe results, grouped facet counts and validated publication-date filtering.
- Stable page pagination and a separate keyset-cursor search endpoint for selected title/quality/sort filters; cursor is tied to its query/sort/quality.
- Privacy-safe preview API, synthetic-only poster hover frames, async lazy thumbnail loading, and browser-checked poster restoration.
- Private saved-search filter presets with export and account-closure deletion; private follows for performer/site/network entries with at least one published video.
- Creator profile bio editing, lifetime insights, paginated own-upload listing, non-authorizing readiness checklist and private creator upload notes.
- Development-only robots disallow, `noindex` metadata, intentionally empty sitemap and correctly served PWA manifest.
- Additive SQLite schema and PostgreSQL migration `011` **draft**. The PostgreSQL migration has not been executed.

## Verification performed

- Before changes: **159/159** inherited Node tests passed on the unmodified v0.24 archive.
- After changes: `tests/checkpoint25.test.js` adds **23** focused checks (including alias security, FTS index updates, hidden-media exclusion, account isolation, export/deletion, cursor validation, receipt-gated search, synthetic preview safety, date filters and creator ownership).
- Run `npm test` for the cumulative suite. `npm run qa:browser:offline` exercises desktop/tablet/mobile Chromium via an about:blank DOM/API proxy; includes search presets and synthetic hover preview. This is **not** a network browser acceptance test.
- `npm run qa:search:benchmark` requires an explicitly provided disposable `DB_PATH`. A 72-row synthetic database with 1,000 LIKE-query iterations was observed at p50 ~0.0131 ms, p95 ~0.0254 ms and p99 ~0.1227 ms in this environment. These numbers do **not** predict performance at production scale or justify OpenSearch migration.
- `npm run qa:contracts:gap` reports remaining pre-existing undocumented route gaps; reviewed OpenAPI operations are a subset, not a complete verified contract for every dynamic route.

## Safety and launch boundaries

- Public adult-content launch remains explicitly disabled; no independent age, consent, participant, rights, territory, provider, or legal certification was performed.
- Creator declaration flags, reviewer-reference fields and a readiness checklist are **not independent verification**.
- Local SQLite search, creator tooling and review queues are not production distributed services. No live PostgreSQL, Spring Boot cutover, OpenSearch, AWS resources, DNS, CDN or vendor services were changed.
- Existing private media and source files are preserved; no real user uploads or private runtime database is packaged.
