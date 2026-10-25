# StreamAtlas engineering continuation after v0.46.0

This work builds on main commit `4f3d4e6456f7e4f1132d2546fdbc2b8e6077e5df` and keeps the private synthetic-media workflow. The uploaded checkpoint-43 task CSV contains 117 task IDs; the current repository's checkpoint-46 tracker has newer status and history. `AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_47.csv` retains every ID and historical column and records task-specific work in this continuation. Status totals remain 28 LOCAL, 60 PARTIAL, 10 PREPARED, and 19 BLOCKED. No production or external acceptance is inferred from local code.

## Work completed locally

- **F04/F08:** `scripts/pg-account-migration-disposable.js` creates its own four-account synthetic SQLite fixture. It transfers 36 reviewed tables through an AES-256-GCM envelope, checks password-hash/token/MFA formats, imports into an empty, acknowledged loopback PostgreSQL 16 target under an exclusive transaction, compares full rows, and checks an injected failure rolls back. `--rehearse` leaves the target empty. `--commit-synthetic` requires `SA_MFA_KEY` so committed fixture MFA records can remain decryptable by a destination using that key. It refuses production, arbitrary source databases, remote hosts, unsupported PostgreSQL versions, and nonempty targets. This does not move live identities, private media bytes, or traffic.
- **F06/F07:** Spring implements five additional authenticated read contracts: library, watch history, watch queue, subscribed feed, and subscriptions. All bind the user to the existing Node session cookie and exclude hidden or actively held media from video lists. Actual PostgreSQL tests cover owner isolation, anonymous/expired/closed sessions, invalid filters, and private responses. Spring writes and broad Node/Spring parity remain open.
- **H08:** Recorded license reviews with malformed, expired, or revoked validity now block private playback and administrator republication of uploaded media. A closed hold alone cannot re-enable a recorded invalid license. Unreviewed synthetic uploads retain the existing local development behavior; production and the explicit license-required mode require a current review.
- **A03/A05/B03/B05/B06/B07:** Real Chromium desktop/mobile navigation, touch, keyboard, login isolation, and axe WCAG checks pass. A repeatable HLS test fetches and decodes a master, variant, and MPEG-TS segment; verifies HLS-to-MP4 switching preserves position; and confirms recovery after one injected 503 segment response. It does not establish all-engine, device, bandwidth, packet-loss, CDN, or revoked credential acceptance.

## Executed validation

The CI-pinned Node 22.16.0, FFmpeg/FFprobe 7.1.5, signed vendored hls.js 1.7.3, and Python Playwright 1.56.0 were used. Release hashes were regenerated after implementation. The full Node suite is split only to keep QA generators from rewriting source files in the checkout.

| Check | Outcome |
| --- | --- |
| Node tests in the main checkout | 430 passed, 0 failed after refreshing release manifests |
| Three QA report-writing Node test files in a disposable source copy | 13 passed, 0 failed |
| Python QA reporting tests | 46 passed, 0 failed |
| Spring Java 21 unit/controller tests | 24 passed, 0 failed |
| Spring Java 21 real disposable PostgreSQL tests | 10 passed, 0 failed (7 existing account tests, 3 new library tests) |
| Fresh disposable PostgreSQL 16.15 | 18 migrations and checksum ledger verified; eight concurrent write clients and idempotency passed |
| Synthetic account migration | 36 tables, 534 records; deliberate-failure rollback, empty-target rehearsal, synthetic commit and duplicate-target refusal passed |
| Actual Chromium 154 browser and axe scan | Desktop/mobile network checks and home-page WCAG scan passed |
| Actual Chromium 154 HLS player | Decoding, switch-position preservation, one injected 503 recovery passed |
| Node/SQLite app and supervised worker | `/api/ready` returned 200 with active worker; 72 catalog records, HLS variants/segments, captions and 206 MP4 range verified |

The local Chromium test uses the system Chromium executable, which is newer than the Playwright 1.56.0 browser revision. The official Playwright Firefox/WebKit/browser downloads returned network-policy 403. The environment draft includes `cdn.playwright.dev` and `playwright.download.prss.microsoft.com` for review and publication; neither engine was tested here. The GitHub Actions API also returned `Forbidden`, so current-commit hosted CI evidence is **NOT RUN**. Existing workflow files and earlier checkpoint reports are not treated as current-commit passes.

## Reproducing the new checks

Run Node checks on Node 22.16.0 and the server with an isolated development `DB_PATH` and `PRIVATE_PATH`. `node --test tests/license-enforcement47.test.js tests/pg-account-migration47.test.js` exercises the new local guards. `CHROME_PATH=/usr/bin/chromium python3 qa/hls-network47.py` needs a running loopback application, Python Playwright 1.56.0, and synthetic demo media.

The account import requires a *fresh* PostgreSQL 16 database named `sa_disposable_*` on an explicit loopback host, all project migrations applied, `SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS`, and `SA_PG_ACCOUNT_MIGRATION=YES_SYNTHETIC_ONLY`. Use `node scripts/pg-account-migration-disposable.js --rehearse` first. For `--commit-synthetic`, set a 64-character hex `SA_MFA_KEY` securely for that disposable destination; preserve it if that synthetic MFA record will be read later. The command does not accept a source path or live account input. Re-running against its committed target must fail.

## Remaining work

The 117-task tracker still includes locally incomplete engineering and work requiring external evidence: full Spring API and migration parity, distributed upload/worker integration, Firefox/WebKit and physical device testing, actual CDN revocation, cloud restore/deployment, authorized provider contracts, verified rights and age evidence, and independent legal/security/operational reviews. Public launch and production cutover remain blocked. No AWS or provider resources were created in this continuation.
