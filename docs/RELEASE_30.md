# StreamAtlas Checkpoint 30 — Partial-task Closure Batch

## Scope and evidence

- Baseline: complete and audited StreamAtlas v0.29.0 (245 automated tests).
- New delivery: cumulative StreamAtlas v0.30.0; old Node/SQLite application retained.
- No adult media, third-party copyrighted videos or real identity documents included.
- Implemented locally (not publicly deployed): D03 autocomplete matching and safe UI highlighting; D05 signed filtered cursor pagination and indexes; J05 explicit operational SLO contract with negative tests.
- Progress on D04: per-filter multi-entity facets and actual search UI controls; tag taxonomy / production-scale indexing still missing.
- Risk reduction: active rights and safety holds are excluded from default video listings, search suggestions, directories, related suggestions, and video-detail lookup. Tests cover held-but-PUBLISHED status.
- New test files: `tests/checkpoint30.test.js`, `tests/checkpoint30-slo.test.js`; existing render test enlarged.
- Stabilized a pre-existing MFA replay test by reusing the originally consumed TOTP code rather than generating a potentially different code across a 30-second boundary.
- Added `src/search-cursor.js`, `src/suggestion-ranking.js`, `migrations/postgresql/015_search_keysets.sql` draft.

## Runtime limitations

- Production PostgreSQL and Spring Boot cutover remain incomplete; PG migration 015 is a *draft*, not executed in PostgreSQL.
- Cursor signatures are HMAC authenticated; configure `SA_SEARCH_CURSOR_SECRET` of at least 32 characters across all API replicas before using the cursor API in production. Developer/test processes generate an ephemeral secret.
- The original offset pagination still exists for compatibility; large-catalog and concurrent mutation performance remain unverified on production data.
- Full Firefox, WebKit, iOS, network ABR HLS, AWS deployment, real age/rights/consent verification, legal reviews and independent penetration tests remain incomplete.
- Draft SLO values are measured only against synthetic sample inputs, not real traffic.

## Release commands

```bash
npm run doctor
npm test
npm run qa:release:verify
npm run qa:browser:offline
npm start
```

## Next tasks (existing partials only)

1. Complete D04 independent tag taxonomy and search facets, plus production-size search benchmark.
2. Continue A06 missing OpenAPI dynamic routes with behavior/permission contracts.
3. Harden C08 recommendation eligibility and measure ranking on a controlled synthetic benchmark.
4. Complete E01–E03 upload limits, security isolation and durable processing acceptance.
5. Execute F02–F06 PostgreSQL/Spring Boot migration tests in real provisioned environments.

See `AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_30.md` for all 117 rows.
