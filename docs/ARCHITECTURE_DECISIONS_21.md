# A01 Architecture Decision Record — QA baseline

## ADR-001 — Keep Node/SQLite as executable baseline until tested backend parity
- **Decision:** No unverified Spring/PG cutover during QA stabilization.
- **Reason:** Existing code contains 127 successful local checks with media, security and workflows; switching both backend and storage before establishing complete contracts risks regressions.
- **Follow-up:** Mirror all public and private responses in Spring, run schema/data parity, transaction and rollback tests, then perform progressive cutover.

## ADR-002 — Separate browser-network acceptance from DOM-injection auditing
- **Decision:** Network runner fails when browser navigation or engine installation fails. Offline runner reports only local UI/MP4/layout heuristics.
- **Reason:** Chromium here is blocked from opening localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`), not a site-specific defect.
- **Follow-up:** Run cross-browser pipeline on GitHub or local unrestricted machine; attach trace/screenshots.

## ADR-003 — Ephemeral per-run identities and private storage
- **Decision:** QA fixtures only with NODE_ENV=test, SA_QA_FIXTURES=YES, unique temp directory, new DB and random credentials. No fixture data shipped in ZIP.
- **Reason:** Prevent demo identities or tokens from leaking into production paths.

## ADR-004 — Explicit contract subset, source inventory for gap visibility
- **Decision:** OpenAPI 3.1 reviewed schemas cover core 44 operations; inventory enumerates source-detected routes including additional dynamic/upload flows.
- **Reason:** A complete route specification needs dedicated review of binary uploads, multipart/streaming, webhook signatures and all admin mutations; do not invent contracts.
- **Follow-up:** Expand endpoint specs, schemas and role/CSRF expectations until every API route is covered.

## ADR-005 — Immutable release hashes and rollback-first deployments
- **Decision:** Generate per-file SHA256, signed-off baseline ZIP hash, deterministic release content manifest, and disaster-recovery rehearsal procedure. Never package runtime SQLite, private content, or credentials.
- **Reason:** A deployment cannot be called reversible if data and rights/removal changes cannot be reconciled.
