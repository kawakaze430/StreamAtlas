# StreamAtlas v0.26.0 — Creator operations and reviewer safeguards

**Scope:** A cumulative development checkpoint from v0.25.0. The 15 original roadmap items E01–E10 and I01–I05 were reviewed and locally improved; **none is claimed complete for production**. No deployment, vendor verification or real media publication was performed. Original synthetic media only.

## New code

- `src/studio-operations.js`: transactional batch upload metadata, planning-only release dates, selected storyboard poster, private collaborator invitations/acceptance/revocation, scoped editor/analyst access, small-cohort-suppressed saved-progress aggregates, admin DLQ and internal license review reminders/history.
- `src/compliance-operations.js`: case assignment, internal due-date view and two distinct sensitive-case reviewer signoffs. Production defaults to dual review; this is still only a local workflow.
- `src/uploads.js`: streaming SHA-256 comparison at finalize, processing dead-letter record after retry exhaustion, hold/license/planned-date approval blocks.
- `src/media-safety.js`: scanner required in production mode. No claim of sandbox certification.
- `src/media-revocation.js`: deduplication of pending operator outbox events, with explicit non-confirmation of actual CDN purge.
- `src/server.js`: protected complaint evidence-reference recording, appeal listing and per-video revocation status, account-closure collaborator cleanup, route integration.
- `src/database.js`: additive SQLite schema; `migrations/postgresql/012_creator_review_operations.sql` is a translation **draft** not applied to PostgreSQL.
- `public/app.js`: studio collaboration invitations, planning-only release and poster controls, privacy-labeled progress aggregates.
- `contracts/openapi.json`: additional reviewed operation entries, not a guarantee of exhaustive dynamic-route parity.

## Security model and limitations

Only the owning approved creator can invite/revoke collaborators. Invitees must explicitly accept. ANALYST can view aggregate creator insights; EDITOR can additionally edit pre-approval metadata; UPLOADER invitations deliberately **do not grant upload access**. Sensitive-case signoffs must be from two distinct administrators before a terminal case decision when the production/default flag is active. These are local RBAC rules; not independently audited or certified.

A planned release never publishes automatically. Review declarations, internal references and reviewer signoffs are **not proof** of adulthood, consent, rights, territory or legal authority. Revocation status deliberately says `cdnRevocationVerified:false` until external confirmation is implemented. Progress-position aggregates are not qualified watch time.

## Tests

- `tests/checkpoint26.test.js` adds 18 focused API/security tests for batch atomicity, ownership, collaborator isolation and revocation, scheduling, poster access, approval safety holds, SHA-256 mismatch and retry/DLQ, production scanner failure, outbox dedup, progress privacy, license history/reminders, case intake, reviewer assignment/SLA, dual review, appeals and provider-status honesty.
- Run `npm test` for the full inherited regression suite and `npm run qa:browser:offline` for synthetic offline Chromium smoke.
- This archive excludes runtime SQLite files, private uploads, signing keys and credentials.

## Verification recorded for this checkpoint

- Node.js **22.16.0**; FFmpeg and FFprobe present (`npm run doctor`).
- **200/200** Node tests passed in the working tree (182 inherited + 18 new), including source attestation and denial-path regression tests.
- Offline Chromium audit passed at **1440px desktop, 820px tablet and 390px mobile** using the synthetic-media offline proxy. The new studio collaborator interface was not independently exercised in this browser audit; its API workflows have Node tests.
- Release source-digest verification and local static security scan passed; the static scan is **not** a dependency CVE audit or penetration test.
- Upgrade check using a disposable SQLite database initialized by the **actual v0.25 source** and reopened with v0.26 retained all **72 synthetic videos**, created all **five new tables**, and returned `PRAGMA integrity_check = ok`.
- Reviewed OpenAPI operations: **97**; static route-gap report still identifies **44** unreviewed literal-route operations. Contract completeness remains unfinished.
- PostgreSQL migration 012, full network HLS browsers, real cloud CDN revocation, external age/rights/consent verification, and production legal signoff were **not tested**.
