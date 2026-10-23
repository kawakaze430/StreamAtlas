# Checkpoints 14–18 — Implementation audit

This report is an **execution record**, not a claim that every originally requested checkpoint can be closed. The working application stays Node 22 + SQLite. None of the new tools contacts AWS or buys a domain. All bundled media is synthetic/non-explicit.

## Checkpoint 14 — Browser validation and playback

**Implemented/tested:** A Python Playwright offline Chromium harness (`npm run audit:offline-browser`). Chromium's `Page.goto` is blocked for local/file/data URLs in the current container. Instead, the harness injects the real application JS and CSS into a DOM, forwards `fetch` calls to a disposable Node API via Python, and takes screenshots. It exercised homepage, searchable categories, video detail, search autocomplete, demo login and Favorites route, at 1440×900, 820×1180 and 390×844. Layout assertions found no horizontal overflow. Browser inspection caught and fixed a real bug: `/favorites` requested `type=favorite` instead of the supported `type=favorites`.

**Still incomplete:** Actual network-based Chromium/WebKit E2E, hls.js bundle/download, Chrome MSE bitrate switching, full browser upload tests, browser accessibility review, real mobile devices. `.github/workflows/browser-checkpoint18.yml` offers a manual GitHub Actions runner for offline and real Chromium checks, but has not been executed here.

## Checkpoint 15 — PostgreSQL migration

**Implemented:** A disposable local PostgreSQL 16 lab in `deployment/postgresql/`, additive migration `004_operations_and_holds.sql`, and catalog count/foreign-key verifier `scripts/pg-verify-catalog.sh`. The existing CI PG smoke script now applies migrations 001–004 and verifies exported catalog parity. The source account and private media stay local and out of the export.

**Still incomplete:** We have no Docker, `psql`, Maven, or PostgreSQL daemon in this execution environment, so neither migration execution nor Spring Boot compilation has been locally verified. There is NO data cutover, dual-read, auth migration or backend switch. Do not run the dev lab on a production database.

## Checkpoint 16 — Cloud media storage and CDN groundwork

**Implemented/tested:** `npm run media:prepare-export -- /absolute/unused/staging` copies **only approved, currently published processed renditions** into a separate private export tree with SHA-256, sizes and a manifest. `npm run media:verify-export -- /absolute/staging` validates every file and rejects tampering/unexpected files/symlinks. `scripts/aws-stage-media.sh` requires a reviewed private S3 location, SSE-KMS key and explicit confirmation; it calls the verifier before any AWS CLI upload. Local integration test stages synthetic processed files and verifies tamper rejection.

**Still incomplete:** No AWS integration was executed. The Node runtime serves media locally; it does NOT use S3 as a live storage provider, does NOT mint signed CDN playback tokens, does NOT support CloudFront invalidation and has not proved bucket/KMS policies, permissions, or disaster recovery. A generic `aws s3 sync` is staging ONLY.

## Checkpoint 17 — Rights and safety moderation

**Implemented/tested:** New `content_holds` records store reason, documented detail, reviewer, opening and closure events. Admin UI supports opening a hold and closing it after a documented disposition. Opening a hold immediately changes the video's status to HIDDEN; an active hold blocks republishing, and closure does not automatically republish. A new test covers unauthorized hold creation, concealment from watch/API results, hold duplication, blocked restoration, and audited closure. Production media approval now unconditionally requires the three internal review-reference records, as well as the existing explicit rights/adulthood/consent checkboxes. **These records are not independently verified consent or identity evidence.**

**Still incomplete:** Effective third-party viewer age assurance, independently verified participant age and consent, licensing contracts, geo-law policies, notice-and-takedown operations, appeals, evidence retention controls, and 24/7 urgent response remain external prerequisites. Future CDN delivery must propagate takedowns immediately.

## Checkpoint 18 — Operations / AWS deployment readiness

**Implemented/tested:** `/api/ready` now checks SQLite integrity and writable private storage, with an optional worker-lease health gate. The authenticated administrator can view queue health and lease state via `/api/admin/operations`, also shown in the admin UI. FFmpeg local decoding now restricts input protocols to file/pipe and limits encode threads. `npm run launch:preflight` explicitly FAILS public-launch readiness and lists remaining external gates. Existing private HTTPS Caddy/Docker/Lightsail infrastructure and encrypted backup tools are preserved. AWS/domain preflight and migration tooling are documented.

**Still incomplete:** No AWS resources were created, no actual hostname/domain was registered, no Docker build was executed, no production SMTP/SES, scanner, logging stack, horizontal processing, security audit or offsite recovery drill exists. Public adult-content hosting must not proceed on the strength of a software checklist.

## Test inventory

- Node suite: **96 passing tests** locally (was 91 at Checkpoint 13), including additional operations, holds, media export, tamper-detection, and fail-closed preflight tests.
- Offline Chromium scripted smoke: **3 viewports × 3 primary routes** plus desktop autocomplete / demo account / Favorites, executed successfully after fixing a real Favorites route bug. Rendered images can be generated locally with `SA_AUDIT_OUTPUT=/private/path python scripts/offline-browser-audit.py`. They are not bundled in the source ZIP.
- Full network Chromium E2E: blocked in this environment by administrative browser navigation policy; optional separate workflow supplied, **not passed here**.
- Docker / PostgreSQL / Maven / AWS: no binaries or authorization in this session; **not executed**.

## Next milestone (Checkpoint 19)

Prioritize real Docker build and pinned HLS.js browser playback in GitHub CI, then isolated PostgreSQL schema/Java contract validation. Once verified, stage a private AWS synthetic demo on an authorized account and complete a restore drill before considering any public traffic. Production legal/content/age/rights/security gates cannot be bypassed by code changes.
