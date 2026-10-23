# Complete 117-task snapshot — authoritative Checkpoint 36 ledger

The status/acceptance wording below is copied from the supplied Checkpoint 36 CSV. **This is an evidence ledger, not an independent certification**. A new model must update both status and evidence after actually testing a change.

## Status counts

| Engineering status | Count |
|---|---:|
| LOCAL | 26 |
| PARTIAL | 51 |
| PREPARED | 10 |
| BLOCKED | 19 |
| NOT_STARTED | 11 |
| **Total** | **117** |

## Execution queue (separate from completion)

| Assignment | Count |
|---|---:|
| LOCAL_VERIFIED | 26 |
| LOCAL_ENGINEERING_QUEUE | 56 |
| BLOCKED_CODEX_USER_ENVIRONMENT | 23 |
| BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | 12 |

The queue is not a second completion score. Even an assigned Codex/user task may contain source code maintained by the primary agent.

## A — QA and baseline (8 tasks)

Group status: LOCAL 4, PARTIAL 4

### A01 · P0 · LOCAL

**Requirement:** Snapshot v0.20 and inventory APIs, SQL schema, routes, assets and risks; create a reproducible release manifest.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### A02 · P0 · LOCAL

**Requirement:** Record the complete user journey and parity matrix for all currently available workflows.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### A03 · P0 · PARTIAL

**Requirement:** Add a full Playwright network-browser runner for Chromium, Firefox, WebKit and mobile emulation.

**Remaining acceptance:** Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### A04 · P0 · LOCAL

**Requirement:** Add seeded test accounts (viewer, creator, moderator, administrator) with private ephemeral fixtures.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### A05 · P0 · PARTIAL

**Requirement:** Run accessibility tests for keyboard, focus, captions, semantic labels, contrast, responsive overflow.

**Remaining acceptance:** Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### A06 · P0 · PARTIAL

**Requirement:** Define OpenAPI and behavioral contract tests for current Node endpoints before migration.

**Remaining acceptance:** Dynamic endpoints and precise typed API contract parity remain incomplete. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** tests/checkpoint36.test.js and source QA

### A07 · P0 · PARTIAL

**Requirement:** Build CI gates for API tests, browser tests, migration tests, dependency/audit checks and media fixtures.

**Remaining acceptance:** GitHub Actions workflows drafted; full real CI matrix has not been observed passing.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### A08 · P0 · LOCAL

**Requirement:** Add release tagging, change logs, upgrade/rollback plans and failure-oriented integration tests.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## B — Playback (16 tasks)

Group status: LOCAL 5, PARTIAL 6, BLOCKED 2, NOT_STARTED 3

### B01 · P0 · NOT_STARTED

**Requirement:** Vendor a reviewed, pinned hls.js version locally with integrity and license verification.

**Remaining acceptance:** Pinned reviewed hls.js binary not vendored and audited locally.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B02 · P0 · LOCAL

**Requirement:** Validate master HLS playlist, codecs, tracks, formats and content MIME types.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B03 · P0 · PARTIAL

**Requirement:** Connect adaptive HLS on Chrome/Firefox/Edge; support native playback on compatible Apple browsers.

**Remaining acceptance:** Player HLS adapter/native fallback exists; cross-browser adaptive playback not validated.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B04 · P0 · PARTIAL

**Requirement:** Create multi-bitrate renditions: lower data-saving, 360p, 480p, 720p, 1080p; 1440p/4K only where source/rights permit.

**Remaining acceptance:** Full browser ABR, higher-resolution media, cost/performance quotas and cross-device testing pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B05 · P0 · NOT_STARTED

**Requirement:** Test automatic ABR changes under throttled bandwidth and packet loss.

**Remaining acceptance:** No observed genuine ABR throttling/packet-loss acceptance.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B06 · P0 · PARTIAL

**Requirement:** Quality settings Auto/manual with position-preserving switching.

**Remaining acceptance:** Manual MP4 qualities exist; real HLS Auto/variant preservation not proven.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B07 · P0 · PARTIAL

**Requirement:** Player recovery from network stalls, decode failures, expired credentials and variant failure.

**Remaining acceptance:** Player retry and MP4 fallback code exists; real CDN/network failures not tested.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B08 · P0 · BLOCKED

**Requirement:** Real-playback tests with signed manifests, initialization files, segments and captions after revocation.

**Remaining acceptance:** Requires live signed HLS manifest/segment/caption revocation testing.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B09 · P0 · BLOCKED

**Requirement:** Cross-browser/device tests: Chrome, Firefox, Edge, Safari macOS and iOS, Android Chrome.

**Remaining acceptance:** Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B10 · P1 · LOCAL

**Requirement:** Custom controls: volume, speed, seek, keyboard shortcuts, skip ±10sec, fullscreen, PiP and theater.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B11 · P1 · LOCAL

**Requirement:** Scrub-bar preview storyboards, hover thumbnail previews and timeline chapters.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B12 · P1 · PARTIAL

**Requirement:** Closed-caption selection, track switching, font/appearance settings and language support.

**Remaining acceptance:** Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B13 · P1 · LOCAL

**Requirement:** Resume position, Continue Watching, playback queue, autoplay-next opt-in and Up Next countdown.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B14 · P1 · PARTIAL

**Requirement:** Mobile tap gestures, orientation handling, fullscreen, and touch-accessible controls.

**Remaining acceptance:** Touch seeking exists; real mobile orientation/fullscreen acceptance missing.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### B15 · P1 · LOCAL

**Requirement:** Playback telemetry: startup time, rebuffer ratio, startup failure, quality shifts, completion.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** tests/checkpoint36.test.js and source QA

### B16 · P2 · NOT_STARTED

**Requirement:** Optional Cast/AirPlay and appropriately licensed offline downloads.

**Remaining acceptance:** No verified Cast/AirPlay or licensed offline download subsystem.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## C — Member experience (10 tasks)

Group status: LOCAL 9, PARTIAL 1

### C01 · P1 · LOCAL

**Requirement:** Make homepage feeds configurable: Latest, Trending, Top Rated, Subscriptions and For You.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### C02 · P1 · LOCAL

**Requirement:** Add redesigned Watch Later and Favorites with reorder/filter/unwatch controls.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### C03 · P1 · LOCAL

**Requirement:** Expand playlists: create, edit, reorder, privacy, bulk operations and share where permitted.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### C04 · P1 · PARTIAL

**Requirement:** Add cross-device sync for watch progress, settings, subscriptions and viewing history.

**Remaining acceptance:** Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### C05 · P1 · LOCAL

**Requirement:** Complete subscription bell preferences: all, highlights, off; in-app notification center.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### C06 · P1 · LOCAL

**Requirement:** Improve likes/dislikes, comments, nested replies, pinned comments and spam/report controls.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### C07 · P1 · LOCAL

**Requirement:** Add a session-based Watch Queue with next/previous, drag reorder and clear.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### C08 · P1 · LOCAL

**Requirement:** Implement personalized recommendation candidates with safety filtering, dedup and diversity.

**Remaining acceptance:** Local candidate ranking, safety filtering, deduplication and diversity implemented and verified. Large-scale outcomes, advanced embedding experiments and consented A/B tests remain separately tracked under D10/K03.

**Next execution:** Local implementation verified; independent deployment and performance acceptance remain separate (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** tests/checkpoint36.test.js and source QA

### C09 · P1 · LOCAL

**Requirement:** Enhance account privacy: history pause, deletion, saved search/history controls, export and deletion.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### C10 · P2 · LOCAL

**Requirement:** Add watch statistics, optional personal preference profiles and PWA installability.

**Remaining acceptance:** Actual mobile install/privacy behavior and production sync remain external acceptance; local engineering criterion met.

**Next execution:** Codex/user for optional physical-device/production validation only; core local engineering tested. (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## D — Discovery/search (10 tasks)

Group status: LOCAL 4, PARTIAL 5, NOT_STARTED 1

### D01 · P1 · LOCAL

**Requirement:** Maintain separate Videos, Categories, Pornstars, Porn Sites, Networks and Channels pages with linked records.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D02 · P1 · PARTIAL

**Requirement:** Fix any remaining navigation/parity issues against the user's recordings.

**Remaining acceptance:** Responsive UI tested offline; exact parity against both supplied recordings not finally signed off.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D03 · P1 · LOCAL

**Requirement:** Improve autocomplete with grouped names, aliases, typos, popularity and highlighted matches.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D04 · P1 · PARTIAL

**Requirement:** Add full multi-entity search results and advanced facets for duration, quality, date, site, performer, tag, channel and network.

**Remaining acceptance:** Large-catalog search indexing/benchmark and complete metadata taxonomy governance remain pending.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D05 · P1 · LOCAL

**Requirement:** Add cursor pagination and stable sort indexes for large catalogs.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D06 · P1 · PARTIAL

**Requirement:** Add canonical URLs, public-safe metadata, sitemap policies and duplicate/near-duplicate merging.

**Remaining acceptance:** Canonical SEO/sitemap policy and safe rights-aware merge workflow remain incomplete; candidates are advisory only.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D07 · P1 · LOCAL

**Requirement:** Add hover previews and optimized thumbnails with lazy loading.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D08 · P1 · PARTIAL

**Requirement:** Add follow filters for performers, sites and networks with verified source permissions.

**Remaining acceptance:** Private follows for performer/site/network; actual source permissions and global feed unfinished.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D09 · P1 · NOT_STARTED

**Requirement:** Migrate search to OpenSearch only after measuring database-search limits.

**Remaining acceptance:** Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### D10 · P2 · PARTIAL

**Requirement:** Add privacy-respecting embedding similarity, reranking, A/B experiments and cold-start evaluation.

**Remaining acceptance:** No trained embeddings, live consented A/B experiments or real-user outcomes.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## E — Creator Studio (10 tasks)

Group status: LOCAL 1, PARTIAL 8, BLOCKED 1

### E01 · P0 · PARTIAL

**Requirement:** Complete resumable direct-to-private-storage upload and integrity checks with per-user limits.

**Remaining acceptance:** Direct-to-S3 resumable upload, storage quota and external integrity acceptance pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### E02 · P0 · PARTIAL

**Requirement:** Implement virus scanning, media validation, no-external-protocol FFmpeg sandbox and resource ceilings.

**Remaining acceptance:** ClamAV fail-closed hook and FFmpeg limits; production isolation/scanning unverified.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### E03 · P0 · PARTIAL

**Requirement:** Add durable processing queues, idempotent jobs, retries, dead-letter queue and progress events.

**Remaining acceptance:** Distributed broker, full worker process chaos tests, supervised rollout and remote observability still pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### E04 · P0 · BLOCKED

**Requirement:** Require validated rights, adult participant evidence, consent and territory before publish.

**Remaining acceptance:** Review references and declarations are not independently verified age/consent/licensing evidence.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### E05 · P0 · PARTIAL

**Requirement:** Support takedown/revocation propagation through DB, search, caches, CDN and all assets.

**Remaining acceptance:** Actual CDN purges and end-to-end revocation test pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### E06 · P1 · PARTIAL

**Requirement:** Build bulk upload, batch metadata editing, scheduling, drafts and publish review queue.

**Remaining acceptance:** Bulk actual transfer browser e2e, scheduling automation, production publish/review workflow and cloud direct uploads remain incomplete.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### E07 · P1 · LOCAL

**Requirement:** Provide thumbnail selection, storyboard generation, subtitle import and video chapters.

**Remaining acceptance:** Large-scale media and live CDN caching require external acceptance; local feature criterion met.

**Next execution:** Codex/user for optional physical-device/production validation only; core local engineering tested. (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### E08 · P1 · PARTIAL

**Requirement:** Enhance studio analytics: views, qualified watch time, retention, referrals, playback errors.

**Remaining acceptance:** Qualified watch time, detailed audience analytics and real-source reporting remain pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** tests/checkpoint36.test.js and source QA

### E09 · P1 · PARTIAL

**Requirement:** Provide channel collaborators with scoped uploader/editor/analyst roles.

**Remaining acceptance:** Full channel team management, delegated upload flow and independent permission audit pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** tests/checkpoint36.test.js and source QA

### E10 · P1 · PARTIAL

**Requirement:** Add license renewal reminders, dispute history, evidence approval and periodic re-review.

**Remaining acceptance:** Authentic licensing evidence, renewal and staff re-review pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## F — PostgreSQL/Spring backend (10 tasks)

Group status: LOCAL 1, PARTIAL 4, PREPARED 2, BLOCKED 1, NOT_STARTED 2

### F01 · P0 · PREPARED

**Requirement:** Start PostgreSQL 16+ in a disposable environment and apply ordered migrations in CI.

**Remaining acceptance:** Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F02 · P0 · PARTIAL

**Requirement:** Add full schema constraints, indexes, FKs, immutable audit log strategy and migration rollback scripts.

**Remaining acceptance:** Added SQLite views/duration keyset indexes and PostgreSQL migration 015 draft; PostgreSQL execution, rollback and full constraint audits remain external.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F03 · P0 · PARTIAL

**Requirement:** Export/import all catalog relationships and verify parity and referential integrity.

**Remaining acceptance:** Signed catalog export and preflight parity; no actual PostgreSQL import/row-level compare.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F04 · P0 · PARTIAL

**Requirement:** Migrate accounts, hashes, MFA, sessions, user history, subscriptions, creator/media metadata and moderation with secure handling.

**Remaining acceptance:** Encrypted SQLite private snapshot export; real identity/MFA/session import unfinished.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F05 · P0 · PREPARED

**Requirement:** Test concurrent writes, consistency, idempotency, isolation and realistic query performance.

**Remaining acceptance:** Concurrency test defined for disposable PostgreSQL; not executed here.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F06 · P0 · PARTIAL

**Requirement:** Build runnable Spring Boot modules for catalog, search, auth, libraries, upload, jobs, moderation and eligibility.

**Remaining acceptance:** Read-only Spring catalog starter only; full authenticated API suite absent.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F07 · P0 · NOT_STARTED

**Requirement:** Run Node-vs-Spring API contract and authorization parity tests, including denial cases.

**Remaining acceptance:** Static route comparison showed 0 matching routes; behavioral parity not established.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F08 · P0 · NOT_STARTED

**Requirement:** Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback.

**Remaining acceptance:** No actual shadow reads, live cutover or rollback exercise.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F09 · P0 · BLOCKED

**Requirement:** Deploy managed database with PITR, encryption, backup policies and restore exercises.

**Remaining acceptance:** No managed RDS/PITR or provider-side encrypted restore drill.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### F10 · P1 · LOCAL

**Requirement:** Consider a Next.js migration only after core API contracts are stable; it is not a prerequisite for global CDN delivery.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## G — AWS and global delivery (15 tasks)

Group status: PARTIAL 3, PREPARED 7, BLOCKED 4, NOT_STARTED 1

### G01 · P0 · BLOCKED

**Requirement:** Obtain domain registration/renewal details, provider acceptance, AWS account access and billing approval.

**Remaining acceptance:** No verified owned domain, AWS account authorization or billing/provider approval.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G02 · P0 · BLOCKED

**Requirement:** Configure least-privilege IAM, deployment roles/OIDC, secrets manager, KMS and budgets/alerts.

**Remaining acceptance:** Least-privilege/IAM/KMS/budget design only; no real resources deployed.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G03 · P0 · BLOCKED

**Requirement:** Deploy password-gated synthetic-media staging with protected access and HTTPS.

**Remaining acceptance:** Password-gated private staging Compose prepared; not deployed/tested on public HTTPS.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G04 · P0 · BLOCKED

**Requirement:** Configure Route 53 or external registrar DNS, ACM certificates, www/app/media hostnames and redirects.

**Remaining acceptance:** DNS/ACM runbooks, no owned DNS records or valid custom media certificate.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G05 · P0 · PREPARED

**Requirement:** Provision private S3 original-media and transcoded-media buckets with lifecycle, encryption and no public ACL.

**Remaining acceptance:** Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G06 · P0 · PREPARED

**Requirement:** Deploy two-path CDN/cache rules: static website assets and protected HLS media; use OAC for S3.

**Remaining acceptance:** CloudFront OAC and uncached manifest template; no provider deployment.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G07 · P0 · PARTIAL

**Requirement:** Implement short-lived signed HLS cookies/URLs and validate every video entitlement and hold.

**Remaining acceptance:** Local signed-cookie entitlement and offline signature inspection; no CloudFront validation.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G08 · P0 · PARTIAL

**Requirement:** Test unsigned/expired/revoked access and source-bucket bypass; rotate keys and invalidate cached assets.

**Remaining acceptance:** Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G09 · P0 · PREPARED

**Requirement:** Deploy Spring API behind ALB on ECS/Fargate or appropriately sized VM with health/readiness and autoscaling.

**Remaining acceptance:** Spring ECS task-definition draft; no service/ALB/autoscaling running.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G10 · P0 · PREPARED

**Requirement:** Deploy SQS + isolated processing or approved MediaConvert workflow; private event processing.

**Remaining acceptance:** SQS/DLQ draft; not integrated with media worker/provider.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G11 · P0 · PARTIAL

**Requirement:** Define region-specific access and content-license rules and deny unauthorized geographies.

**Remaining acceptance:** Optional HMAC edge country assertion; not all entry points/territory legal rules gated.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G12 · P0 · PREPARED

**Requirement:** Add WAF, rate limits, DDoS and bot protections at edge, origin and API layers.

**Remaining acceptance:** Unattached WAF draft and local throttling; not deployed/tuned against attacks.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G13 · P0 · PREPARED

**Requirement:** Measure global page load, startup/buffering, 403s and CDN cache hit rate from approved regions.

**Remaining acceptance:** Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G14 · P1 · PREPARED

**Requirement:** Add lifecycle tiers, cost allocation and egress forecasting; avoid always-on multi-region backends initially.

**Remaining acceptance:** Cost calculator uses placeholder inputs; no actual AWS bills/rates allocation.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### G15 · P2 · NOT_STARTED

**Requirement:** Evaluate secondary region/multi-AZ DR after proving demand and SLO need.

**Remaining acceptance:** Multi-region DR decision helper only; no second-region exercises.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## H — Rights, age and compliance (10 tasks)

Group status: PARTIAL 4, BLOCKED 6

### H01 · P0, EXTERNAL · BLOCKED

**Requirement:** Obtain written legal guidance for where the service can operate and where content can be viewed.

**Remaining acceptance:** Requires written independent jurisdiction-specific legal opinion.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### H02 · P0, EXTERNAL · BLOCKED

**Requirement:** Confirm acceptable use with AWS, registrar, CDN, email and payment vendors for intended lawful content.

**Remaining acceptance:** Requires written terms/provider acceptance for intended use.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### H03 · P0, EXTERNAL · BLOCKED

**Requirement:** Contract a suitable viewer age-assurance provider and validate live signed API/webhook schemas.

**Remaining acceptance:** Signed callbacks are local stubs; no contracted age-assurance provider/live schema.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### H04 · P0 · PARTIAL

**Requirement:** Gate every discovery, watch, preview, thumbnail, API, direct media URL, and upload entrypoint as required.

**Remaining acceptance:** Complete runtime route inventory and independent age/territory bypass audit remain pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** tests/checkpoint36.test.js and source QA

### H05 · P0 · PARTIAL

**Requirement:** Bind verification to account/session, enforce expiry and revocation, and minimize sensitive document retention.

**Remaining acceptance:** Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### H06 · P0, EXTERNAL · BLOCKED

**Requirement:** Independently verify participant adulthood, informed consent, permitted uses and license provenance.

**Remaining acceptance:** Independent adulthood, consent and license documentary verification has not occurred.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### H07 · P0 · PARTIAL

**Requirement:** Build documentary storage with encryption, restrictive access, retention, legal holds and revocation.

**Remaining acceptance:** Encrypted documentary vault, legal holds, access logging and independent audit still pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### H08 · P0 · PARTIAL

**Requirement:** Enforce per-video territory/time restrictions and prevent re-publication after revoked/expired rights.

**Remaining acceptance:** Full jurisdiction/time access enforcement and revocation on remote CDNs pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### H09 · P0, EXTERNAL · BLOCKED

**Requirement:** Complete privacy impact assessment, deletion/retention policies, regulator and legal requirements.

**Remaining acceptance:** No completed privacy impact assessment or jurisdiction-specific retention legal signoff.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### H10 · P0, EXTERNAL · BLOCKED

**Requirement:** Run age-assurance effectiveness and bypass testing, provider and independent legal signoff.

**Remaining acceptance:** No independent age-assurance effectiveness/bypass assessment or legal approval.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## I — Human moderation (8 tasks)

Group status: LOCAL 1, PARTIAL 5, BLOCKED 2

### I01 · P0 · PARTIAL

**Requirement:** Harden copyright, consent, age, privacy and emergency intake forms with ticket identifiers and structured evidence.

**Remaining acceptance:** Human intake SOP, legal standing and regulator procedures remain pending.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### I02 · P0 · PARTIAL

**Requirement:** Add reviewer assignment, severities, SLA timers, immutable audit and chain-of-custody evidence.

**Remaining acceptance:** True staffed SLA and immutable evidence custody acceptance remain pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### I03 · P0 · PARTIAL

**Requirement:** Connect immediate takedown to all source/rendition/previews, feeds, caches and CDN invalidation.

**Remaining acceptance:** Actual distributed takedown and cache-purge test pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** tests/checkpoint36.test.js and source QA

### I04 · P0 · PARTIAL

**Requirement:** Add uploader notice, appeal, counter-notice and repeat-infringer logic where legally required.

**Remaining acceptance:** Appeals and decisions exist; legally reviewed counter-notice/repeat-infringer procedure missing.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### I05 · P0 · PARTIAL

**Requirement:** Protect restricted reviewer documents and establish dual-review for sensitive decisions.

**Remaining acceptance:** Independent sensitive-case reviewer and documentary access checks pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### I06 · P0, EXTERNAL · BLOCKED

**Requirement:** Train and staff appropriate human moderation, escalation and emergency response.

**Remaining acceptance:** Human moderator staffing, training, emergency/24-7 coverage unverified.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### I07 · P0, EXTERNAL · BLOCKED

**Requirement:** Review response times and notices with jurisdiction-specific counsel.

**Remaining acceptance:** Jurisdiction-specific deadline/SLA legal review has not occurred.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### I08 · P1 · LOCAL

**Requirement:** Add spam/abuse/duplicate detection assistance with human confirmation.

**Remaining acceptance:** Locally implemented with human decision; operating staffing and production abuse-model evaluation remain separate gates.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## J — Operations/security/reliability (12 tasks)

Group status: LOCAL 1, PARTIAL 7, PREPARED 1, BLOCKED 2, NOT_STARTED 1

### J01 · P0 · PARTIAL

**Requirement:** Review threat model and deploy dependency/container/IaC scanning with SBOM.

**Remaining acceptance:** Basic SBOM/source scans and unrun CI definitions; full container/IaC/CVE scanner unverified.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J02 · P0 · PARTIAL

**Requirement:** Production MFA for privileged roles, verified email, recovery procedures, session/rate limit tests.

**Remaining acceptance:** Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J03 · P0 · PARTIAL

**Requirement:** Complete secret rotation, IAM boundary tests, KMS key policies and audit trail access.

**Remaining acceptance:** Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J04 · P0 · BLOCKED

**Requirement:** Run independent penetration test, remediate critical/high findings and retest.

**Remaining acceptance:** Independent penetration assessment/remediation/retest not performed.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J05 · P0 · LOCAL

**Requirement:** Define SLOs for availability, API p95, error rates, video startup, rebuffering and jobs.

**Remaining acceptance:** Local implementation complete; external production acceptance is separate.

**Next execution:** Local QA / future independent acceptance (`LOCAL_VERIFIED`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J06 · P0 · PARTIAL

**Requirement:** Deploy metrics, traces, logs, alerts, on-call rotations and incident runbooks.

**Remaining acceptance:** Production alerting, tracing and staffed on-call remain pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J07 · P0 · BLOCKED

**Requirement:** Perform encrypted DB + S3/KMS complete restore to disposable cloud environment, verify media parity.

**Remaining acceptance:** Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J08 · P0 · PARTIAL

**Requirement:** Run realistic concurrency, long soak, cache cold-start, large upload, worker-failure and network-failure tests.

**Remaining acceptance:** Real distributed soak, worker failure and rate stress tests pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J09 · P0 · PARTIAL

**Requirement:** Test rollback, failover, release safety, backup retention, domain/TLS renewal and provider downtime.

**Remaining acceptance:** Real AWS KMS/S3 restore, rollback and DNS/failover exercise pending.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J10 · P0 · PARTIAL

**Requirement:** Complete an evidence-based launch checklist requiring real operational/legal/provider signoff.

**Remaining acceptance:** Independent legal, security, provider and operational signoff remain pending.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J11 · P1 · PREPARED

**Requirement:** Add cost dashboards, budget thresholds, per-title transcode/storage/egress reporting.

**Remaining acceptance:** Cost estimates/static calculators only; no real AWS allocation/alerts deployed.

**Next execution:** ChatGPT owns implementation and local tests; Codex/user only for final external acceptance (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### J12 · P2 · NOT_STARTED

**Requirement:** Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements.

**Remaining acceptance:** No multi-AZ/multiregion chaos or recovery exercise.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

## K — Optional enhancements (8 tasks)

Group status: PARTIAL 4, BLOCKED 1, NOT_STARTED 3

### K01 · P2 · PARTIAL

**Requirement:** Cast/AirPlay and installable PWA (subject to device/platform policy).

**Remaining acceptance:** PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing.

**Next execution:** User/Codex with Docker, PostgreSQL, browser devices, cloud credentials or secure CI (`BLOCKED_CODEX_USER_ENVIRONMENT`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### K02 · P2 · NOT_STARTED

**Requirement:** AI-assisted captions, metadata and tag suggestions with manual review.

**Remaining acceptance:** Local tag matching is not AI. Model/provider-assisted caption or metadata suggestions with human review are not implemented.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### K03 · P2 · PARTIAL

**Requirement:** Experimental recommendations and A/B testing with privacy safeguards.

**Remaining acceptance:** Live online randomized assignment, consent management and unbiased business-impact metrics remain unimplemented.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### K04 · P2 · PARTIAL

**Requirement:** Multi-language interface and regional metadata.

**Remaining acceptance:** Language preference saved; complete translated/localized interface absent.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### K05 · P2 · PARTIAL

**Requirement:** Short-form feed and authorized live streaming as separately designed services.

**Remaining acceptance:** Working local short-clips listing; full vertical feed, authorized live streaming/moderation service and device tests unfinished.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### K06 · P2 · BLOCKED

**Requirement:** Subscription billing and ad operations only with compatible permitted providers.

**Remaining acceptance:** No authorized compatible payment/ad provider or billing launch.

**Next execution:** User + qualified provider, counsel, regulator or independent assessor (`BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### K07 · P2 · NOT_STARTED

**Requirement:** Creator earnings, approved partnerships and deeper analytics.

**Remaining acceptance:** No verified creator earnings/payout partnership platform.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

### K08 · P2 · NOT_STARTED

**Requirement:** Account-controlled offline access to videos with explicit download licenses.

**Remaining acceptance:** No consent/entitlement-checked encrypted offline download implementation.

**Next execution:** ChatGPT local coding / manual verification (`LOCAL_ENGINEERING_QUEUE`).

**Latest checkpoint evidence:** Baseline evidence unchanged

