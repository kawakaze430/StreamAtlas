# StreamAtlas v0.27.0 — PostgreSQL migration readiness and AWS preflight

Checkpoint 27 builds cumulatively on v0.26.0 and reviews **15 original roadmap tasks F01–F10 and G01–G05**. It does **not** mark them production complete. The running app is still Node 22 + SQLite; no remote service was deployed, no AWS resources changed and no external age/rights/consent/provider approvals were asserted.

## Implemented local work

- `scripts/pg-migrations.js`: 13 ordered migrations, SHA-256 manifest and ledger, transaction-bound migration application, PostgreSQL 16+ and disposable loopback/database-name checks. Static `--check` works locally; `--apply` needs real PostgreSQL/psql.
- `migrations/postgresql/013_integrity_and_audit.sql`: nonnegative constraints, extra indexes and append-only trigger draft, with manual rollback DDL. This migration is **not executed** locally.
- `scripts/pg-schema-parity.js`: read-only 56-table SQLite/PG DDL name+column coverage report. `scripts/pg-catalog-integrity.js` validates export checksums, primary keys, foreign keys and numeric counters; catalog import builder now rejects orphaned references.
- `scripts/pg-private-snapshot.js`: opt-in AES-256-GCM/scrypt encrypted SQLite snapshot with authenticated verification, 0600 output, public-root exclusion, tamper rejection and 64 MiB limit. Not a Postgres importer.
- `scripts/pg-concurrency-smoke.js` and `.github/workflows/postgres-disposable.yml`: disposable 8-client PG idempotency/concurrency smoke and PostgreSQL 16/Maven CI job **prepared, not executed here**.
- Spring read-only catalog hardened: loopback default, no raw media URL in responses, active-hold and local license-review filters. Static Spring contract gap report shows no behavioral parity.
- Fail-closed PostgreSQL cutover checklist, AWS G01–G05 evidence template/checker, IAM/budget planning notes and a private originals S3 bucket Terraform **draft** distinct from CDN renditions. No Terraform CLI validation or apply occurred.

## Verification

See `docs/STATUS_27.md` for individual task evidence and blockers. New local regression tests in `tests/checkpoint27.test.js` cover migration ordering/guards, schema/catalog integrity, encrypted snapshot denial/tamper handling, Spring safety configuration, API parity gap, AWS evidence denial, Terraform template structure and CI configuration. Run `npm test` and `npm run qa:release:verify` after extracting the cumulative ZIP. Actual PostgreSQL migration, Maven compilation, Terraform validation, network HLS browsers, cloud delivery and independent legal/provider reviews remain pending.

## Verified locally in this release

- **218/218 Node tests passed** (200 inherited + 18 new), including after correcting the Node readiness version to 0.27.0.
- `npm run doctor` passed on Node 22.16.0 with FFmpeg/FFprobe 7.1.5.
- `npm run qa:release:verify` passed with 287 tracked source files; `npm run qa:security` static scan passed. Neither is a dependency CVE audit or independent penetration test.
- Offline Chromium synthetic-media browser audit passed at desktop 1440px, tablet 820px and mobile 390px, including existing member navigation and sample MP4 playback. This is **not** a networked Firefox/WebKit/Safari or signed-HLS acceptance test.
- SQLite/PG DDL audit found **56/56 table names** and no missing column names. This is static DDL comparison, **not** execution of SQL on PostgreSQL.
- Local `--apply` with no explicit disposable PostgreSQL acknowledgment correctly failed closed. No PostgreSQL server/`psql`, Maven or Terraform CLI was available; CI workflow execution remains unverified.
- **Upgrade preservation:** a disposable SQLite database initialized by the actual v0.26.0 source was opened by v0.27.0; it retained all **72 synthetic videos**, **56 application tables**, and `PRAGMA integrity_check = ok`.
- The cumulative archive was extracted into a fresh directory; **218/218 tests and source integrity verification passed** in that extracted copy.
