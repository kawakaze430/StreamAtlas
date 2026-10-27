# StreamAtlas engineering continuation after v0.46.0

This continuation builds on main commit `594161459819158bf4c2a3e0f5cd94e24a288c9e`. The primary running application remains Node.js/SQLite with private synthetic media. The 117-task ledger is [`UPDATED_117_TASK_STATUS_48.csv`](../AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_48.csv); each task retains its prior status and history unless this continuation supplies specific new evidence. Local engineering checks do not approve public launch or production traffic.

## Work completed locally

- **F02/F08/J09:** `scripts/pg-checkpoint-rollback-disposable.js` accepts only an explicitly acknowledged, local PostgreSQL 16 pair of distinct `sa_disposable_*` databases. It rejects a non-synthetic source and a nonempty target. A real drill checkpointed a reviewed source, restored a separate target, committed a deliberate preference/history fault there, then restored the checkpoint and compared every table's rows plus each public sequence's definition, `last_value`, and `is_called` state. The source stayed read-only and no traffic shifted. The temporary owner-only dump contains **synthetic data and is not encrypted**; this is not a production backup, cloud restore, failover, PITR, or cutover exercise.
- **F06/F07:** Spring adds `GET /api/security/csrf` and the first bounded account mutation, `PATCH /api/me/preferences`. It binds writes to the existing session owner, checks a signed double-submit CSRF proof and request origin, validates preference fields, and updates PostgreSQL in a transaction. A shared `SA_CSRF_SECRET` is required because Node's generated development secret cannot be shared with Spring. Actual Node and newly packaged Spring HTTP responses matched across seven scenarios and 28 requests for **two read paths** (`GET /api/auth/me` and `GET /api/me/preferences?expanded=1`); the PostgreSQL fixture was cleaned up. This does not establish write-response or broader API parity. The many other Spring API families remain open.
- **E01:** `src/private-multipart-store.js` adds an isolated **local** private multipart adapter. Immutable part writes and local receipts survive process restart, verify per-part and whole-file SHA-256, reject conflicting retries and unsafe links, and keep owner namespaces separate. Its receipts explicitly say `providerVerified:false` and `publicationAuthorized:false`. The adapter is not yet wired into the application upload endpoint, does not implement aggregate user quotas, and does not attest S3 or another provider.
- **A07:** The CI workflow is configured to run the three real PostgreSQL Spring integration classes and the synthetic PostgreSQL account import/checkpoint drill. `scripts/ci-summary.py` now requires actual, unskipped cases from each class and records both database drill checks. This is a local workflow configuration and summary check; GitHub-hosted execution on this commit is **NOT RUN**.

## Executed checks

The committed [checkpoint-48 evidence summary](../qa/checkpoint48-evidence.json) records the scoped engineering checks below. `reports/onboarding/*.json` paths are local, ignored test artifacts and are not part of the source archive.

| Check | Result |
| --- | --- |
| Synthetic PostgreSQL 16 checkpoint and fault/restore drill | **PASS**; 63 tables, 552 records, exact row and sequence parity after restoration; local `reports/onboarding/rollback48.json` |
| Focused Node rollback and Spring inventory tests | 5 passed, 0 failed |
| Python QA reporting tests | 47 passed, 0 failed |
| Spring Java 21 unit/controller tests | 28 passed, 0 failed; includes a Node-issued CSRF vector |
| Spring Java 21 real disposable PostgreSQL tests | 14 passed, 0 failed; account, library and preference classes |
| Actual Node/Spring HTTP read parity on fresh disposable PostgreSQL 16 | **PASS**, seven identity scenarios, 14 whole-response comparisons across 28 requests and two read paths; local `reports/onboarding/spring-node-parity48.json` |
| Node application/guard tests | 435 passed, 0 failed |
| QA report-writing Node tests in a disposable source copy | 13 passed, 0 failed |
| Release-manifest attestation Node tests | 4 passed, 0 failed after manifest regeneration; **452 Node tests total** across the three groups |
| Real WebKit 26.0 strict network browser | **PASS**, 14 desktop/mobile navigation, touch, keyboard, login isolation, media and home-page axe checks; local `reports/onboarding/qa-browser-webkit47.json` |
| Real Firefox 142.0.1 strict network browser | Browser launch timed out before application checks, including a shorter host diagnostic run; local `reports/onboarding/qa-browser-firefox47.json` |
| Real Chromium 154 HLS network player | **PASS**, all three strict checks: decoded HLS, position-preserving HLS-to-MP4 switch, and injected 503 recovery; local `reports/onboarding/qa-hls-chromium47-full.json` |
| Real WebKit 26.0 HLS network player | **PARTIAL**: decoded HLS and recovered from an injected 503. The HLS-to-MP4 switch failed: MP4 returned HTTP 200 but video stayed at time 0 and `readyState` 0 with `NETWORK_NO_SOURCE`. Direct MP4 on the same WebKit passed, isolating the transition; local `reports/onboarding/qa-hls-webkit47-full.json` and `qa-direct-mp4-webkit47.json` |

The checkpoint drill requires `SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS`, `SA_PG_ROLLBACK=YES_SYNTHETIC_ONLY`, a reviewed synthetic source in `PGDATABASE`, `PGHOST=127.0.0.1`, an explicit `PGPORT`, and an empty distinct disposable `--target`. It can be run with `npm run db:pg:rollback:disposable -- --target sa_disposable_example`; the command refuses production mode and remote hosts. It intentionally does not support live account data or an unreviewed database.

The WebKit run used the official Playwright 1.56.0 engine with signed Debian shared libraries placed under `/workspace/streamatlas-tools`. Set `PYTHONPATH=/workspace/streamatlas-tools/python-playwright56`, `PLAYWRIGHT_BROWSERS_PATH=/workspace/streamatlas-tools/browsers56`, `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`, and `SA_QA_REQUIRE_AXE=1`, then run `python3 qa/network-e2e.py --engines webkit --strict --output reports/onboarding/qa-browser-webkit47.json`. Run the deeper player check with `python3 qa/hls-network47.py --engine webkit --output reports/onboarding/qa-hls-webkit47-full.json` against a local synthetic-media app. The host-requirement flag bypassed a false-negative `ldconfig` check for libraries present under the workspace; the real browser launch, network requests, axe check and application assertions all ran. It did not bypass TLS or the test assertions. Firefox's downloaded official binary could not launch in this host and therefore supplies no Firefox application result.

## Remaining acceptance

All 117 tasks still have the same status categories as the preceding tracker: 28 LOCAL, 60 PARTIAL, 10 PREPARED, and 19 BLOCKED. Full cloud provider access and rights, age, jurisdiction, content, security, operational, and legal sign-off are outside local code evidence. In particular, provider-backed multipart upload and delivery, integrated worker durability, complete Node/Spring migration parity, managed encrypted backup/restore, approved cutover, Firefox/device and broad HLS fault coverage, hosted CI for this commit, and public deployment are not established here.
