# StreamAtlas v0.33.0 — 117-task status audit

**Local:** 23 · **Partial:** 54 · **Prepared:** 10 · **Blocked:** 19 · **Not started:** 11 · **Total:** 117

A task is not production-accepted merely because a local code path or test exists. External requirements remain unchanged.

## Tasks advanced in this release

- **A06 — PARTIAL**: Added reviewed public/admin tag and offline evaluation contracts. Remaining: Dynamic API-route coverage and full authorization-contract parity remain unfinished.
- **B04 — PARTIAL**: Source-aware FFmpeg MP4/HLS ladder generates 360p/480p/720p/1080p only when source dimensions support them; legacy lo/hi preserved. 360p tested end-to-end. Remaining: Full browser ABR, higher-resolution media, cost/performance quotas and cross-device testing pending.
- **D04 — PARTIAL**: Independent manually reviewed tag taxonomy, admin assignment, public facet/filter UI, signed cursor inclusion and safety-hold exclusion tested. Remaining: Large-catalog search indexing/benchmark and complete metadata taxonomy governance remain pending.
- **D10 — PARTIAL**: Bounded deterministic content-token/category/performer Jaccard scoring and synthetic offline NDCG/Recall@K with cold-start evaluation. Remaining: No trained embeddings, live consented A/B experiments or real-user outcomes.
- **K03 — PARTIAL**: Added offline cold-start evaluation with deterministic coverage, NDCG@K, Recall@K and no viewer identifiers. Remaining: Live online randomized assignment, consent management and unbiased business-impact metrics remain unimplemented.

## All 117 tasks

### A01 — LOCAL

Priority: P0 · Owner: LOCAL_VERIFIED

Snapshot v0.20 and inventory APIs, SQL schema, routes, assets and risks; create a reproducible release manifest.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### A02 — LOCAL

Priority: P0 · Owner: LOCAL_VERIFIED

Record the complete user journey and parity matrix for all currently available workflows.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### A03 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Add a full Playwright network-browser runner for Chromium, Firefox, WebKit and mobile emulation.

Remaining acceptance: Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed.

### A04 — LOCAL

Priority: P0 · Owner: LOCAL_VERIFIED

Add seeded test accounts (viewer, creator, moderator, administrator) with private ephemeral fixtures.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### A05 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Run accessibility tests for keyboard, focus, captions, semantic labels, contrast, responsive overflow.

Remaining acceptance: Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding.

### A06 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Define OpenAPI and behavioral contract tests for current Node endpoints before migration.

Remaining acceptance: Dynamic API-route coverage and full authorization-contract parity remain unfinished.

### A07 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Build CI gates for API tests, browser tests, migration tests, dependency/audit checks and media fixtures.

Remaining acceptance: GitHub Actions workflows drafted; full real CI matrix has not been observed passing.

### A08 — LOCAL

Priority: P0 · Owner: LOCAL_VERIFIED

Add release tagging, change logs, upgrade/rollback plans and failure-oriented integration tests.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### B01 — NOT_STARTED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Vendor a reviewed, pinned hls.js version locally with integrity and license verification.

Remaining acceptance: Pinned reviewed hls.js binary not vendored and audited locally.

### B02 — LOCAL

Priority: P0 · Owner: LOCAL_VERIFIED

Validate master HLS playlist, codecs, tracks, formats and content MIME types.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### B03 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Connect adaptive HLS on Chrome/Firefox/Edge; support native playback on compatible Apple browsers.

Remaining acceptance: Player HLS adapter/native fallback exists; cross-browser adaptive playback not validated.

### B04 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Create multi-bitrate renditions: lower data-saving, 360p, 480p, 720p, 1080p; 1440p/4K only where source/rights permit.

Remaining acceptance: Full browser ABR, higher-resolution media, cost/performance quotas and cross-device testing pending.

### B05 — NOT_STARTED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Test automatic ABR changes under throttled bandwidth and packet loss.

Remaining acceptance: No observed genuine ABR throttling/packet-loss acceptance.

### B06 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Quality settings Auto/manual with position-preserving switching.

Remaining acceptance: Manual MP4 qualities exist; real HLS Auto/variant preservation not proven.

### B07 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Player recovery from network stalls, decode failures, expired credentials and variant failure.

Remaining acceptance: Player retry and MP4 fallback code exists; real CDN/network failures not tested.

### B08 — BLOCKED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Real-playback tests with signed manifests, initialization files, segments and captions after revocation.

Remaining acceptance: Requires live signed HLS manifest/segment/caption revocation testing.

### B09 — BLOCKED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Cross-browser/device tests: Chrome, Firefox, Edge, Safari macOS and iOS, Android Chrome.

Remaining acceptance: Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested.

### B10 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Custom controls: volume, speed, seek, keyboard shortcuts, skip ±10sec, fullscreen, PiP and theater.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### B11 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Scrub-bar preview storyboards, hover thumbnail previews and timeline chapters.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### B12 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Closed-caption selection, track switching, font/appearance settings and language support.

Remaining acceptance: Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated.

### B13 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Resume position, Continue Watching, playback queue, autoplay-next opt-in and Up Next countdown.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### B14 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Mobile tap gestures, orientation handling, fullscreen, and touch-accessible controls.

Remaining acceptance: Touch seeking exists; real mobile orientation/fullscreen acceptance missing.

### B15 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Playback telemetry: startup time, rebuffer ratio, startup failure, quality shifts, completion.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### B16 — NOT_STARTED

Priority: P2 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Optional Cast/AirPlay and appropriately licensed offline downloads.

Remaining acceptance: No verified Cast/AirPlay or licensed offline download subsystem.

### C01 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Make homepage feeds configurable: Latest, Trending, Top Rated, Subscriptions and For You.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### C02 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Add redesigned Watch Later and Favorites with reorder/filter/unwatch controls.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### C03 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Expand playlists: create, edit, reorder, privacy, bulk operations and share where permitted.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### C04 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Add cross-device sync for watch progress, settings, subscriptions and viewing history.

Remaining acceptance: Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending.

### C05 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Complete subscription bell preferences: all, highlights, off; in-app notification center.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### C06 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Improve likes/dislikes, comments, nested replies, pinned comments and spam/report controls.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### C07 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Add a session-based Watch Queue with next/previous, drag reorder and clear.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### C08 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Implement personalized recommendation candidates with safety filtering, dedup and diversity.

Remaining acceptance: Catalog/feed search exclusions strengthened so published videos with open rights/safety holds no longer surface; full-scale personalized candidate evaluation remains unverified.

### C09 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Enhance account privacy: history pause, deletion, saved search/history controls, export and deletion.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### C10 — PARTIAL

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

Add watch statistics, optional personal preference profiles and PWA installability.

Remaining acceptance: Offline-only safe shell service worker added, avoiding caching any API/media or user-specific content; actual mobile installability/store-policy validation pending.

### D01 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Maintain separate Videos, Categories, Pornstars, Porn Sites, Networks and Channels pages with linked records.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### D02 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Fix any remaining navigation/parity issues against the user's recordings.

Remaining acceptance: Responsive UI tested offline; exact parity against both supplied recordings not finally signed off.

### D03 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Improve autocomplete with grouped names, aliases, typos, popularity and highlighted matches.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### D04 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Add full multi-entity search results and advanced facets for duration, quality, date, site, performer, tag, channel and network.

Remaining acceptance: Large-catalog search indexing/benchmark and complete metadata taxonomy governance remain pending.

### D05 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Add cursor pagination and stable sort indexes for large catalogs.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### D06 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Add canonical URLs, public-safe metadata, sitemap policies and duplicate/near-duplicate merging.

Remaining acceptance: Canonical SEO/sitemap policy and safe rights-aware merge workflow remain incomplete; candidates are advisory only.

### D07 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Add hover previews and optimized thumbnails with lazy loading.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### D08 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Add follow filters for performers, sites and networks with verified source permissions.

Remaining acceptance: Private follows for performer/site/network; actual source permissions and global feed unfinished.

### D09 — NOT_STARTED

Priority: P1 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Migrate search to OpenSearch only after measuring database-search limits.

Remaining acceptance: Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment.

### D10 — PARTIAL

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

Add privacy-respecting embedding similarity, reranking, A/B experiments and cold-start evaluation.

Remaining acceptance: No trained embeddings, live consented A/B experiments or real-user outcomes.

### E01 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Complete resumable direct-to-private-storage upload and integrity checks with per-user limits.

Remaining acceptance: Local resumable private chunks and checksums work; direct S3 multipart transfer untested.

### E02 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Implement virus scanning, media validation, no-external-protocol FFmpeg sandbox and resource ceilings.

Remaining acceptance: ClamAV fail-closed hook and FFmpeg limits; production isolation/scanning unverified.

### E03 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Add durable processing queues, idempotent jobs, retries, dead-letter queue and progress events.

Remaining acceptance: SQLite durable jobs, lease, retries, local DLQ; no tested SQS worker integration.

### E04 — BLOCKED

Priority: P0 · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Require validated rights, adult participant evidence, consent and territory before publish.

Remaining acceptance: Review references and declarations are not independently verified age/consent/licensing evidence.

### E05 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Support takedown/revocation propagation through DB, search, caches, CDN and all assets.

Remaining acceptance: Local hide/holds/outbox and scripted invalidation; real CDN purge and all-copy expiry unverified.

### E06 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Build bulk upload, batch metadata editing, scheduling, drafts and publish review queue.

Remaining acceptance: Batch metadata edits, drafts, planned schedule; no real bulk uploader/auto-publish.

### E07 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Provide thumbnail selection, storyboard generation, subtitle import and video chapters.

Remaining acceptance: Private poster selection, WebVTT and chapters; production storyboard/derivatives unvalidated.

### E08 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Enhance studio analytics: views, qualified watch time, retention, referrals, playback errors.

Remaining acceptance: Opt-in anonymized aggregate creator QoE dashboard with <5-sample suppression; qualified watch time, referral metrics and real creator analytics remain unfinished.

### E09 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Provide channel collaborators with scoped uploader/editor/analyst roles.

Remaining acceptance: Collaborator roles/invitations; upload-role complete authorization not implemented.

### E10 — PARTIAL

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Add license renewal reminders, dispute history, evidence approval and periodic re-review.

Remaining acceptance: License lifecycle/history/reminders implemented locally; independent evidence review outstanding.

### F01 — PREPARED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Start PostgreSQL 16+ in a disposable environment and apply ordered migrations in CI.

Remaining acceptance: Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution.

### F02 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Add full schema constraints, indexes, FKs, immutable audit log strategy and migration rollback scripts.

Remaining acceptance: Added SQLite views/duration keyset indexes and PostgreSQL migration 015 draft; PostgreSQL execution, rollback and full constraint audits remain external.

### F03 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Export/import all catalog relationships and verify parity and referential integrity.

Remaining acceptance: Signed catalog export and preflight parity; no actual PostgreSQL import/row-level compare.

### F04 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Migrate accounts, hashes, MFA, sessions, user history, subscriptions, creator/media metadata and moderation with secure handling.

Remaining acceptance: Encrypted SQLite private snapshot export; real identity/MFA/session import unfinished.

### F05 — PREPARED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Test concurrent writes, consistency, idempotency, isolation and realistic query performance.

Remaining acceptance: Concurrency test defined for disposable PostgreSQL; not executed here.

### F06 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Build runnable Spring Boot modules for catalog, search, auth, libraries, upload, jobs, moderation and eligibility.

Remaining acceptance: Read-only Spring catalog starter only; full authenticated API suite absent.

### F07 — NOT_STARTED

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Run Node-vs-Spring API contract and authorization parity tests, including denial cases.

Remaining acceptance: Static route comparison showed 0 matching routes; behavioral parity not established.

### F08 — NOT_STARTED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback.

Remaining acceptance: No actual shadow reads, live cutover or rollback exercise.

### F09 — BLOCKED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Deploy managed database with PITR, encryption, backup policies and restore exercises.

Remaining acceptance: No managed RDS/PITR or provider-side encrypted restore drill.

### F10 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Consider a Next.js migration only after core API contracts are stable; it is not a prerequisite for global CDN delivery.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### G01 — BLOCKED

Priority: P0 · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Obtain domain registration/renewal details, provider acceptance, AWS account access and billing approval.

Remaining acceptance: No verified owned domain, AWS account authorization or billing/provider approval.

### G02 — BLOCKED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Configure least-privilege IAM, deployment roles/OIDC, secrets manager, KMS and budgets/alerts.

Remaining acceptance: Least-privilege/IAM/KMS/budget design only; no real resources deployed.

### G03 — BLOCKED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Deploy password-gated synthetic-media staging with protected access and HTTPS.

Remaining acceptance: Password-gated private staging Compose prepared; not deployed/tested on public HTTPS.

### G04 — BLOCKED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Configure Route 53 or external registrar DNS, ACM certificates, www/app/media hostnames and redirects.

Remaining acceptance: DNS/ACM runbooks, no owned DNS records or valid custom media certificate.

### G05 — PREPARED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Provision private S3 original-media and transcoded-media buckets with lifecycle, encryption and no public ACL.

Remaining acceptance: Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks.

### G06 — PREPARED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Deploy two-path CDN/cache rules: static website assets and protected HLS media; use OAC for S3.

Remaining acceptance: CloudFront OAC and uncached manifest template; no provider deployment.

### G07 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Implement short-lived signed HLS cookies/URLs and validate every video entitlement and hold.

Remaining acceptance: Local signed-cookie entitlement and offline signature inspection; no CloudFront validation.

### G08 — PARTIAL

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Test unsigned/expired/revoked access and source-bucket bypass; rotate keys and invalidate cached assets.

Remaining acceptance: Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS.

### G09 — PREPARED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Deploy Spring API behind ALB on ECS/Fargate or appropriately sized VM with health/readiness and autoscaling.

Remaining acceptance: Spring ECS task-definition draft; no service/ALB/autoscaling running.

### G10 — PREPARED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Deploy SQS + isolated processing or approved MediaConvert workflow; private event processing.

Remaining acceptance: SQS/DLQ draft; not integrated with media worker/provider.

### G11 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Define region-specific access and content-license rules and deny unauthorized geographies.

Remaining acceptance: Optional HMAC edge country assertion; not all entry points/territory legal rules gated.

### G12 — PREPARED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Add WAF, rate limits, DDoS and bot protections at edge, origin and API layers.

Remaining acceptance: Unattached WAF draft and local throttling; not deployed/tuned against attacks.

### G13 — PREPARED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Measure global page load, startup/buffering, 403s and CDN cache hit rate from approved regions.

Remaining acceptance: Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry.

### G14 — PREPARED

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Add lifecycle tiers, cost allocation and egress forecasting; avoid always-on multi-region backends initially.

Remaining acceptance: Cost calculator uses placeholder inputs; no actual AWS bills/rates allocation.

### G15 — NOT_STARTED

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

Evaluate secondary region/multi-AZ DR after proving demand and SLO need.

Remaining acceptance: Multi-region DR decision helper only; no second-region exercises.

### H01 — BLOCKED

Priority: P0, EXTERNAL · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Obtain written legal guidance for where the service can operate and where content can be viewed.

Remaining acceptance: Requires written independent jurisdiction-specific legal opinion.

### H02 — BLOCKED

Priority: P0, EXTERNAL · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Confirm acceptable use with AWS, registrar, CDN, email and payment vendors for intended lawful content.

Remaining acceptance: Requires written terms/provider acceptance for intended use.

### H03 — BLOCKED

Priority: P0, EXTERNAL · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Contract a suitable viewer age-assurance provider and validate live signed API/webhook schemas.

Remaining acceptance: Signed callbacks are local stubs; no contracted age-assurance provider/live schema.

### H04 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Gate every discovery, watch, preview, thumbnail, API, direct media URL, and upload entrypoint as required.

Remaining acceptance: Shared public video catalog and search suggestions now exclude active safety holds; live CDN/edge bypass validation remains external.

### H05 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Bind verification to account/session, enforce expiry and revocation, and minimize sensitive document retention.

Remaining acceptance: Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified.

### H06 — BLOCKED

Priority: P0, EXTERNAL · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Independently verify participant adulthood, informed consent, permitted uses and license provenance.

Remaining acceptance: Independent adulthood, consent and license documentary verification has not occurred.

### H07 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Build documentary storage with encryption, restrictive access, retention, legal holds and revocation.

Remaining acceptance: Evidence references and restricted access design; no audited encrypted documentary vault.

### H08 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Enforce per-video territory/time restrictions and prevent re-publication after revoked/expired rights.

Remaining acceptance: License expiry/hold hides local media; real geography/CDN enforcement missing.

### H09 — BLOCKED

Priority: P0, EXTERNAL · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Complete privacy impact assessment, deletion/retention policies, regulator and legal requirements.

Remaining acceptance: No completed privacy impact assessment or jurisdiction-specific retention legal signoff.

### H10 — BLOCKED

Priority: P0, EXTERNAL · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Run age-assurance effectiveness and bypass testing, provider and independent legal signoff.

Remaining acceptance: No independent age-assurance effectiveness/bypass assessment or legal approval.

### I01 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Harden copyright, consent, age, privacy and emergency intake forms with ticket identifiers and structured evidence.

Remaining acceptance: Structured complaint tickets and opaque references; documentary chain-of-custody lacking.

### I02 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Add reviewer assignment, severities, SLA timers, immutable audit and chain-of-custody evidence.

Remaining acceptance: Local case assignment, priorities, SLA display and audit; no immutable external journal or paging.

### I03 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Connect immediate takedown to all source/rendition/previews, feeds, caches and CDN invalidation.

Remaining acceptance: Local takedowns and CDN invalidation outbox; no real propagation verification.

### I04 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Add uploader notice, appeal, counter-notice and repeat-infringer logic where legally required.

Remaining acceptance: Appeals and decisions exist; legally reviewed counter-notice/repeat-infringer procedure missing.

### I05 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Protect restricted reviewer documents and establish dual-review for sensitive decisions.

Remaining acceptance: Dual admin signoffs for AGE/CONSENT; no independently secured reviewer document vault.

### I06 — BLOCKED

Priority: P0, EXTERNAL · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Train and staff appropriate human moderation, escalation and emergency response.

Remaining acceptance: Human moderator staffing, training, emergency/24-7 coverage unverified.

### I07 — BLOCKED

Priority: P0, EXTERNAL · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Review response times and notices with jurisdiction-specific counsel.

Remaining acceptance: Jurisdiction-specific deadline/SLA legal review has not occurred.

### I08 — LOCAL

Priority: P1 · Owner: LOCAL_VERIFIED

Add spam/abuse/duplicate detection assistance with human confirmation.

Remaining acceptance: Locally implemented with human decision; operating staffing and production abuse-model evaluation remain separate gates.

### J01 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Review threat model and deploy dependency/container/IaC scanning with SBOM.

Remaining acceptance: Basic SBOM/source scans and unrun CI definitions; full container/IaC/CVE scanner unverified.

### J02 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Production MFA for privileged roles, verified email, recovery procedures, session/rate limit tests.

Remaining acceptance: Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent.

### J03 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Complete secret rotation, IAM boundary tests, KMS key policies and audit trail access.

Remaining acceptance: Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested.

### J04 — BLOCKED

Priority: P0 · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Run independent penetration test, remediate critical/high findings and retest.

Remaining acceptance: Independent penetration assessment/remediation/retest not performed.

### J05 — LOCAL

Priority: P0 · Owner: LOCAL_VERIFIED

Define SLOs for availability, API p95, error rates, video startup, rebuffering and jobs.

Remaining acceptance: Local implementation complete; external production acceptance is separate.

### J06 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Deploy metrics, traces, logs, alerts, on-call rotations and incident runbooks.

Remaining acceptance: Private metrics and alerts code; no deployed observability or staffed on-call.

### J07 — BLOCKED

Priority: P0 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Perform encrypted DB + S3/KMS complete restore to disposable cloud environment, verify media parity.

Remaining acceptance: Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done.

### J08 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Run realistic concurrency, long soak, cache cold-start, large upload, worker-failure and network-failure tests.

Remaining acceptance: Bounded synthetic localhost load/worker tests; no realistic soak/chaos/perf baseline.

### J09 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Test rollback, failover, release safety, backup retention, domain/TLS renewal and provider downtime.

Remaining acceptance: Local integrity/rollback guidance; real failover, certificate and provider outage test absent.

### J10 — PARTIAL

Priority: P0 · Owner: LOCAL_ENGINEERING_QUEUE

Complete an evidence-based launch checklist requiring real operational/legal/provider signoff.

Remaining acceptance: Fail-closed launch checklist with evidence gate; real legal/provider/operator signatures missing.

### J11 — PREPARED

Priority: P1 · Owner: LOCAL_ENGINEERING_QUEUE

Add cost dashboards, budget thresholds, per-title transcode/storage/egress reporting.

Remaining acceptance: Cost estimates/static calculators only; no real AWS allocation/alerts deployed.

### J12 — NOT_STARTED

Priority: P2 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements.

Remaining acceptance: No multi-AZ/multiregion chaos or recovery exercise.

### K01 — PARTIAL

Priority: P2 · Owner: BLOCKED_CODEX_USER_ENVIRONMENT

Cast/AirPlay and installable PWA (subject to device/platform policy).

Remaining acceptance: PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing.

### K02 — NOT_STARTED

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

AI-assisted captions, metadata and tag suggestions with manual review.

Remaining acceptance: Local tag matching is not AI. Model/provider-assisted caption or metadata suggestions with human review are not implemented.

### K03 — PARTIAL

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

Experimental recommendations and A/B testing with privacy safeguards.

Remaining acceptance: Live online randomized assignment, consent management and unbiased business-impact metrics remain unimplemented.

### K04 — PARTIAL

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

Multi-language interface and regional metadata.

Remaining acceptance: Language preference saved; complete translated/localized interface absent.

### K05 — PARTIAL

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

Short-form feed and authorized live streaming as separately designed services.

Remaining acceptance: Working local short-clips listing; full vertical feed, authorized live streaming/moderation service and device tests unfinished.

### K06 — BLOCKED

Priority: P2 · Owner: BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL

Subscription billing and ad operations only with compatible permitted providers.

Remaining acceptance: No authorized compatible payment/ad provider or billing launch.

### K07 — NOT_STARTED

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

Creator earnings, approved partnerships and deeper analytics.

Remaining acceptance: No verified creator earnings/payout partnership platform.

### K08 — NOT_STARTED

Priority: P2 · Owner: LOCAL_ENGINEERING_QUEUE

Account-controlled offline access to videos with explicit download licenses.

Remaining acceptance: No consent/entitlement-checked encrypted offline download implementation.

