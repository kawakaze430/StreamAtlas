## v0.28.0 — Checkpoint 28 (private CDN/security readiness)
- Signed-cookie policy inspector, HMAC trusted geo assertions, optional per-country CDN signing gate, user throttling and production verified-admin-email requirement.
- Unapplied S3/CloudFront manifest-cache, SQS/DLQ, WAF and Spring ECS drafts; static infrastructure guardrails.
- Operator-supplied QoE/SLO, cost and DR evaluators; CycloneDX lockfile SBOM and security CI proposal.
- 19 new tests, 237 total passed locally; no AWS or production approval.

## v0.24.0
- Home feed tabs; advanced saved-library and playlist controls; account preferences; notification modes; comment threads, moderation pin/report; queue navigation; recommendation diversity; opt-in search history; watch statistics; PWA icons and PostgreSQL schema draft.
- Tests and full release manifest updated.

## 0.22.0 — Player engineering checkpoint
- Generated original, reproducible multi-quality HLS demo media, captions, and previews.
- Added timeline/preview, caption/volume selectors, status, session QoE, autoplay countdown, mobile seeking, retry/fallback.
- Produced private uploaded-video storyboard thumbnails inherited from media authorization.
- Added HTTP HLS media assertions, browser control checks, and full regression suite.
- See `docs/STATUS_22.md` for honest browser/ABR acceptance gaps.

# Changelog

## v0.9.0 — 2026-10-21 — Combined Checkpoints 07–09

- Preserved all 72 Checkpoint 06 sample catalog entries and existing browsing, media processing, user library and moderation APIs.
- Added optional pinned hls.js 1.7.3 browser adapter, HLS error recovery/teardown/quality resume and MP4 fallback (library binary unavailable; real graphical player test not passed).
- Added single-use hashed TTL password-reset and verification codes, private development outbox, AES-256-GCM protected authenticator MFA, TOTP replay protection, account closure, current-password checks and tighter production configuration.
- Added an offline encrypted backup-and-restore tool for SQLite plus private uploads/processed media, including authenticated manifest, no-overwrite restore and tamper tests.
- Added singleton SQLite worker lease heartbeat and a documented nonroot/network-disabled Docker worker example (container not executed here).
- Authored PostgreSQL 15+ catalog/account/creator migrations, SHA-256 validated JSONL catalog export and ordered SQL import generator, with 72 sample videos verified. Live Postgres import has NOT been run.
- Introduced a read-only Spring Boot/PostgreSQL catalog starter; Maven build and Next.js/full backend migration remain outstanding.
- **87 automated tests pass**, including regression, identity and recovery workflows, worker lease, PostgreSQL export/tamper tests, and clean-ZIP extraction. Chromium E2E remains unavailable.

## v0.6.0 — 2026-10-21 — Checkpoint 06

- Added optional account-based Pause Watch History and Autoplay Next persistence, clearing Favorites/Watch Later and own-comment deletion.
- Implemented secure authenticated password changes and revocation of all other sessions.
- Added duration/quality search filters with parameter validation, and an explainable subscriber/favorite-category/popularity recommendation feed.
- Added atomic SQL job claiming, tunable media timeout and an admin-only diagnostic endpoint.
- Implemented consistent SQLite backup/manifest SHA-256/`integrity_check` and a tamper-detecting verification CLI.
- Authored optional Playwright desktop/mobile smoke tests for local execution; NOT browser-verified in this container.
- Updated API, security, release and operational documentation; **72 passing tests** from source and complete ZIP verification.
- Pending: desktop HLS.js/ABR, graphical/browser accessibility verification, worker sandbox, real account recovery/MFA, infrastructure migration and legal verification.

## v0.5.0 — 2026-10-21 — Combined Checkpoints 04 and 05

- Moved normal media processing off the API process into a supervised, persistent SQLite-backed single worker, with recovery of interrupted PROCESSING states, event logs and hash verification.
- Created two separately segmented HLS renditions, protected master/variant playlists, retained dual MP4 playback and added native-browser HLS selection.
- Implemented signed CSRF token challenge on mutations, same-origin checks and persistent authentication rate-limit buckets.
- Added pre-publication WebVTT caption authoring and protected subtitle playback.
- Created moderator-only internal rights/age/consent reference workflow (not real verification) and operational job dashboard.
- Added new-upload notifications to subscribed members, inbox read controls, library-data export and account-settings UI.
- Added report priority labels, processing event viewer and dry-run disk-staging cleanup CLI.
- Added regression and process-level integration tests. **60 tests pass**; headless Chromium screenshots remain blocked.



## v0.3.0 — 2026-10-21 — Checkpoint 03

- Enhanced watch controls, quality switching and chapter UI.
- Added creator upload analytics and editable pending-upload metadata.
- Added 320p processed data-saver MP4 and protected media route.
- Admin suspend/reinstate creator actions and table filtering.
- Added playlist editing, history item deletion and account session controls.
- Fixed hidden-video leakage through playlists and hidden video interactions.
- Added view-throttling and proxy-header trust improvement.
- Added 9 integration tests; **51 tests pass**.
- Browser graphical E2E still not validated due to Chromium headless timeout.

## v0.2.0 — Checkpoint 02

- Creator enrollments, private chunked uploads, FFmpeg processing, HLS, admin preview, moderation and audit.

## v0.1.0 — Checkpoint 01

- Catalog/navigation, demo media, basic accounts, library, search, video pages and moderation.

## 0.21.0 — Reproducible QA foundations (A01–A08)
- Immutable input archive digest, source+schema+asset inventories and integrity verification.
- User journey parity, architecture decision records and rollback failure scenarios.
- Strict network cross-browser Playwright and optional offline Chromium reporting.
- Ephemeral random multi-role fixtures; reviewed 44-operation OpenAPI subset and HTTP contract tests.
- Added CI regression, browser, WCAG automation and dependency audit gates.
- Fixed missing accessible name on video-page comment textarea.
- Public adult-content launch remains blocked; live PG/Spring/AWS/certified verification not completed.
