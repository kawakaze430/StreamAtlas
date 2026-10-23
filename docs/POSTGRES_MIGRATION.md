# Checkpoint 09 — PostgreSQL migration foundation, NOT live cutover

This release preserves Node/SQLite as the **only executable production-path backend of the prototype**. The three PostgreSQL migration scripts define matching catalog, identity and operations schemas, and `npm run db:export-catalog` can export a redacted **catalog-only** fixture with per-file SHA256 checksums.

## Prepare a fresh PostgreSQL database (manual; not verified here)

Apply migrations in order with `psql -v ON_ERROR_STOP=1 -f migrations/postgresql/001_catalog.sql`, then `002_accounts.sql`, then `003_creator_and_operations.sql`. They are designed for PostgreSQL 15+ and contain no live data. A DBA must review access control, secrets, backups, timestamps, schema migrations, and extensions before production use.

## Export a catalog fixture

`DB_PATH=/absolute/streamatlas.db npm run db:export-catalog -- /absolute/private/export-dir`

Check `manifest.json`: it has the record count and SHA256 of each `*.jsonl`. None of these exports includes user accounts, session tokens, passwords, age/consent references, upload records, or private media. Export does include public catalog names, titles and media URLs, so keep it private. Run `npm run db:build-pg-import -- /absolute/private/export-dir /absolute/private/catalog-import.pg.sql` to generate a transactionally wrapped, checksum-checked catalog INSERT script in dependency order with identity sequences adjusted. Manually review it before `psql -v ON_ERROR_STOP=1 -f /absolute/private/catalog-import.pg.sql`. This SQL generator is tested; applying the script to PostgreSQL is still **not verified** in this environment.

## Cutover roadmap

1. Provision an isolated PostgreSQL dev instance, apply the migrations, and validate constraints.
2. Build a repeatable catalog loader; compare row counts, slugs, and search/sort results with SQLite.
3. Introduce repository interfaces + JDBC/pg client for catalog read paths, behind feature flags; run API contract tests.
4. Migrate identity/session data only after encryption/privacy review, with sessions rotated; never copy reset/MFA secrets casually.
5. Rework jobs using PostgreSQL `FOR UPDATE SKIP LOCKED` and durable leases (SQLite currently uses a 20-second singleton-worker lease); media stays separate.
6. Shadow-read and measure parity, take consistent backup/rollback snapshot, coordinate write freeze and cutover.
7. Spring Boot and Next.js are still proposed architecture: **not built or tested in this checkpoint**.

### Difference from SQLite

- PostgreSQL uses BIGINT identity/UUID/TIMESTAMPTZ/BOOLEAN; the Node prototype's schema and queries are SQLite-specific.
- `INSERT OR IGNORE`, `group_concat`, `MAX(0,expr)`, and SQLite `db.exec()` transaction patterns cannot be copied directly into JDBC.
- Identity sequences need `setval` after explicit-ID imports.
- License/consent references in schema are not independently verified proof and do not authorize public adult-content deployment.

## Checkpoint 15 addition (partially done)
A disposable PostgreSQL Compose lab is included in `deployment/postgresql/` with additive `004_operations_and_holds.sql`, followed by an integrity-count verification script. No live cutover or PostgreSQL execution was available in the current container (no Docker, PostgreSQL or Maven binaries). **DO NOT call the database migration complete.**
