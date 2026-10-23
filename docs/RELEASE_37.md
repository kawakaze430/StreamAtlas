# StreamAtlas 0.37.0 — Contract hardening checkpoint (2026-10-23)

## Source changes

- Preserve all v0.36.0 Node/SQLite, frontend, synthetic media, creator/moderation, and AWS templates unchanged except explicit QA/release metadata.
- Review 32 baseline uncovered literal HTTP operations, increase generated OpenAPI inventory 141 → 173 operations (the scanner finds 123 literal operations; **zero remain uncovered in that scoped scanner**).
- Document signed age-verification webhook header, server-to-server metrics bearer token and `text/plain` response, and add useful typed request schemas for complaint intake, upload initiation and password recovery.
- Add `npm run qa:contracts:strict`; strict gate produces an audit JSON and exits nonzero when a source-visible literal operation is unreviewed.
- Add strict gate to `.github/workflows/qa-checkpoint21.yml` (added locally; GitHub-hosted CI not executed).
- Add synthetic live-HTTP behavior tests for 11 admin reads, complaint intake, CSRF, and configured-provider absence. Negative-control test proves the strict gate fails on newly injected routes.
- Correct package-lock version from outdated 0.35.0 to 0.37.0.

## Evidence scope

Actual runnable commands, counts and limitations are recorded in `AUDIT_AND_HANDOFF/PORTABLE_HANDOFF_37/02_VERIFICATION.md`. Only local tests/QA run here are checked. Existing v0.36.0 295-pass test baseline came from the handoff; the v0.37.0 test suite adds four tests.

## Intentionally incomplete

- Static regex scanner **is not** a complete discovery of dynamic URL handlers, media range endpoints, uploads, or runtime authorization contracts. Many old OAS operations still use generic `{type:'object'}` schemas; do not claim full typed parity.
- A06 and A07 stay PARTIAL; ledger counts remain 26 LOCAL, 51 PARTIAL, 10 PREPARED, 19 BLOCKED, 11 NOT_STARTED.
- No hosting, vendor age assurance, consent/rights verification, regional legality, public adult-media availability, or independent penetration testing has been established.

## Rollback

Prior full archive `streamatlas-complete-through-36-PORTABLE-HANDOFF(1).zip` has verified SHA-256 `2adc16367e8b78474603ad5f81f7d2810b9bb4808653813494a300e1409043d6` (uploaded baseline). Do not blindly replace production workloads; no production environment is configured here. Changes mainly affect contract/QA, source code behavior is unchanged.
