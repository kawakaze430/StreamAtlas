# A08 — Upgrade, rollback, and failure test playbook

**Scope:** private synthetic-media preview only. The current app is Node+SQLite; PostgreSQL and AWS have NOT been promoted to live backend infrastructure.

## Before changing the running system
1. Stop API + FFmpeg worker. Export a *complete* encrypted local SQLite and media backup using `npm run secure:backup` with the documented operator environment (`SA_BACKUP_OFFLINE=1`, cryptographic key set and stored out of band).
2. Verify backup cryptographic integrity, restore to an isolated directory using `npm run secure:restore`, check 72 baseline sample video rows and media hashes. Use `npm run recovery:drill` as the synthetic runbook validation.
3. Record deployed source release SHA, DB schema hash, asset manifest and verification matrix; retain previous container image immutably.
4. Check content holds and rights revocations. These must remain enforced after every rollback; never restore older publicly visible states that bypass recent takedowns.

## Upgrading a private preview
1. Verify release manifest: `npm run qa:release:verify`.
2. Run `npm test`, offline browser audit, and *separately* passing network QA on the actual deployment runner.
3. Apply schema changes only after a rehearsal against a restored copy; migrations must be backward-compatible with the last release where possible.
4. Launch new container behind the private password gate; verify `/api/ready`, catalog shapes, login, moderator access denial and media restrictions.
5. Gradually route authorized synthetic traffic, monitor metrics, and retain previous release for rollback.

## Rollback triggers and procedure
- Triggers: repeated 5xx, missing media, authentication failures, migrations breaking key flows, revoked video becoming accessible, failed recovery checks.
- Immediately stop the new media worker and disable public playback; prevent stale cached assets through purge/invalidation.
- Roll back app/container code to the previously verified digest **without blindly reverting legal/safety state**. If DB has an incompatible migration, restore to an isolated clone and reconcile current safety holds, revocations, complaints and consent changes before any exposure.
- Verify former API contracts, 4 roles, encrypted data/media consistency, revocation queue and access logs before reopening private preview.
- File an incident with timestamp, cause, changes, and human approval.

## Failure-oriented cases covered / pending
| Scenario | Evidence |
|---|---|
| Missing CSRF on member mutation | tests/qa-contract.test.js (403) |
| Viewer / creator / moderator access admin endpoint | tests/qa-contract.test.js (403) |
| Login with valid seeded isolated fixture | tests/qa-contract.test.js (success) |
| Attempt to seed outside test or into existing DB | tests/qa-contract.test.js (fail closed) |
| Restore tampered encrypted media archive | existing tests + `npm run recovery:drill` |
| Private S3 media token expiry / revocation | locally tested signer; live AWS pending |
| Interrupted FFmpeg worker + job replay | existing media/lease test suite |
| Actual PostgreSQL migration failure, live S3 outage, AZ failover | PENDING authenticated infrastructure |

A migration rollback is NOT equivalent to resuming publishing; legal holds/rights must be reconciled with the most recent records first.

## Suggested immutable tag and rollback record
After CI is green and the release manifest is committed, create a signed annotated repository tag such as `streamatlas-v0.21.0` and record its Git commit SHA with the release ZIP checksum. This tool did not create a GitHub release or push any tag. Do not deploy from an unverified working-tree snapshot.
| Tampered source after release | `tests/qa-integrity.test.js` rejects altered copied `public/app.js` |
| Missing source in rollback package | `tests/qa-integrity.test.js` rejects missing copied `src/server.js` |
