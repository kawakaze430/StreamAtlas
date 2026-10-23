# PostgreSQL migration lab — Checkpoint 15 (not cut over)

The current website **continues to run on Node.js/SQLite**. This Compose setup provides an isolated, disposable PostgreSQL 16 database with the eight ordered schema migrations. It does not move user passwords, sessions, tokens, private media or moderation evidence.

1. Copy `.env.example` to `.env`, replace the lab password, install Docker Engine + Compose plugin and run `docker compose -f compose.yaml up -d` from this directory. Port 55432 is bound to loopback only. Never expose it publicly.
2. From the project root use `DB_PATH=/absolute/to/test.sqlite npm run db:export-catalog -- /absolute/private/pg-export`, then `npm run db:build-pg-import -- /absolute/private/pg-export /absolute/private/catalog-import.sql`.
3. Import into the **disposable lab only**: `docker compose -f deployment/postgresql/compose.yaml exec -T postgres psql -v ON_ERROR_STOP=1 -U streamatlas_lab -d streamatlas_lab < /absolute/private/catalog-import.sql`.
4. Compare counts and relationships using `scripts/pg-verify-catalog.sh /absolute/private/pg-export/manifest.json`. This reads your PG* connection environment and needs local `psql`; alternatively run its SQL manually in the Compose container.
5. Always back up the original SQLite data/media before experimenting. The PostgreSQL schema alone is NOT a production cutover.

The optional Spring Boot starter in `backend-spring` is a read-only API contract, not yet the production backend. Running its Maven build against this lab requires external Maven dependencies that are unavailable in this container.

## Checkpoint 19
`005_compliance_cases_and_receipts.sql` adds formal reports/appeals and privacy-minimized signed age-receipt records. Compose mounts it for disposable lab initialization. It has not been executed on PostgreSQL here.
