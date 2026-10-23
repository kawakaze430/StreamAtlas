# StreamAtlas v0.29 — 117-task status (audit-conservative)

**Total: 117 tasks.** Status: LOCAL 19, PARTIAL 54, PREPARED 10, BLOCKED 19, NOT_STARTED 15.

> LOCAL means a feature has executable local implementation and local tests, not approval for public launch. PARTIAL may contain extensive code but lacks part of its acceptance criteria. No external approval or AWS changes were made.

## Work improved in this release

- **A05 — PARTIAL**: Run accessibility tests for keyboard, focus, captions, semantic labels, contrast, responsive overflow. Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding.
- **A06 — PARTIAL**: Define OpenAPI and behavioral contract tests for current Node endpoints before migration. Two reviewed OpenAPI operations and explicit QoE JSON schema added; dynamic routes still require manual contract parity.
- **B12 — PARTIAL**: Closed-caption selection, track switching, font/appearance settings and language support. Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated.
- **B15 — LOCAL**: Playback telemetry: startup time, rebuffer ratio, startup failure, quality shifts, completion. Opt-in, default-off telemetry now collects startup, startup-failure, rebuffer time and ratio, errors, quality switches, completion. Data aggregated by video/day without user/session/IP identifiers; test coverage and Chromium QA. Production sampling not verified.
- **C04 — PARTIAL**: Add cross-device sync for watch progress, settings, subscriptions and viewing history. Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending.
- **C10 — PARTIAL**: Add watch statistics, optional personal preference profiles and PWA installability. Offline-only safe shell service worker added, avoiding caching any API/media or user-specific content; actual mobile installability/store-policy validation pending.
- **D07 — LOCAL**: Add hover previews and optimized thumbnails with lazy loading. Generated 320w/640w responsive WebP posters; rendered srcset/sizes/lazy images, hover preview restores srcset; Chromium offline checks passed at desktop/tablet/mobile.
- **E08 — PARTIAL**: Enhance studio analytics: views, qualified watch time, retention, referrals, playback errors. Opt-in anonymized aggregate creator QoE dashboard with <5-sample suppression; qualified watch time, referral metrics and real creator analytics remain unfinished.
- **F02 — PARTIAL**: Add full schema constraints, indexes, FKs, immutable audit log strategy and migration rollback scripts. Added migration 014 with QoE counters and rollback draft; no real PostgreSQL execution or constraints acceptance.
- **H04 — PARTIAL**: Gate every discovery, watch, preview, thumbnail, API, direct media URL, and upload entrypoint as required. Receipt-gated private demo now protects synthetic poster, MP4 and HLS static paths, tested against direct URL bypass. Real CDN, distributed edge and all preview paths not validated.
- **J05 — PARTIAL**: Define SLOs for availability, API p95, error rates, video startup, rebuffering and jobs. Session startup/rebuffer aggregates now exist, but no representative SLO measurement, acceptance targets or production observability evidence.

## Every task (full evidence ledger)

### A

- **A01 [LOCAL] P0:** Snapshot v0.20 and inventory APIs, SQL schema, routes, assets and risks; create a reproducible release manifest. — Source snapshot, inventories and reproducible manifests exist; hash verification reran successfully.
- **A02 [LOCAL] P0:** Record the complete user journey and parity matrix for all currently available workflows. — Journey and parity documents exist; real-world walkthroughs remain separate acceptance work.
- **A03 [PARTIAL] P0:** Add a full Playwright network-browser runner for Chromium, Firefox, WebKit and mobile emulation. — Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed.
- **A04 [LOCAL] P0:** Add seeded test accounts (viewer, creator, moderator, administrator) with private ephemeral fixtures. — Four role-based ephemeral fixture accounts and isolation tests exist.
- **A05 [PARTIAL] P0:** Run accessibility tests for keyboard, focus, captions, semantic labels, contrast, responsive overflow. — Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding.
- **A06 [PARTIAL] P0:** Define OpenAPI and behavioral contract tests for current Node endpoints before migration. — Two reviewed OpenAPI operations and explicit QoE JSON schema added; dynamic routes still require manual contract parity.
- **A07 [PARTIAL] P0:** Build CI gates for API tests, browser tests, migration tests, dependency/audit checks and media fixtures. — GitHub Actions workflows drafted; full real CI matrix has not been observed passing.
- **A08 [LOCAL] P0:** Add release tagging, change logs, upgrade/rollback plans and failure-oriented integration tests. — Changelogs, checksum manifest, deterministic packaging and rollback instructions tested locally.

### B

- **B01 [NOT_STARTED] P0:** Vendor a reviewed, pinned hls.js version locally with integrity and license verification. — Pinned reviewed hls.js binary not vendored and audited locally.
- **B02 [LOCAL] P0:** Validate master HLS playlist, codecs, tracks, formats and content MIME types. — Synthetic HLS playlists/segments and FFprobe decode/MIME tests exist; live protected playback separate.
- **B03 [PARTIAL] P0:** Connect adaptive HLS on Chrome/Firefox/Edge; support native playback on compatible Apple browsers. — Player HLS adapter/native fallback exists; cross-browser adaptive playback not validated.
- **B04 [PARTIAL] P0:** Create multi-bitrate renditions: lower data-saving, 360p, 480p, 720p, 1080p; 1440p/4K only where source/rights permit. — Synthetic standard/data-saver renditions present; full 360p–1080p adaptive ladder unverified.
- **B05 [NOT_STARTED] P0:** Test automatic ABR changes under throttled bandwidth and packet loss. — No observed genuine ABR throttling/packet-loss acceptance.
- **B06 [PARTIAL] P0:** Quality settings Auto/manual with position-preserving switching. — Manual MP4 qualities exist; real HLS Auto/variant preservation not proven.
- **B07 [PARTIAL] P0:** Player recovery from network stalls, decode failures, expired credentials and variant failure. — Player retry and MP4 fallback code exists; real CDN/network failures not tested.
- **B08 [BLOCKED] P0:** Real-playback tests with signed manifests, initialization files, segments and captions after revocation. — Requires live signed HLS manifest/segment/caption revocation testing.
- **B09 [BLOCKED] P0:** Cross-browser/device tests: Chrome, Firefox, Edge, Safari macOS and iOS, Android Chrome. — Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested.
- **B10 [LOCAL] P1:** Custom controls: volume, speed, seek, keyboard shortcuts, skip ±10sec, fullscreen, PiP and theater. — Speed, volume, seek, shortcuts, skip, fullscreen, PiP and theater controls in local player.
- **B11 [LOCAL] P1:** Scrub-bar preview storyboards, hover thumbnail previews and timeline chapters. — Synthetic hover seek previews and chapter controls implemented locally.
- **B12 [PARTIAL] P1:** Closed-caption selection, track switching, font/appearance settings and language support. — Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated.
- **B13 [LOCAL] P1:** Resume position, Continue Watching, playback queue, autoplay-next opt-in and Up Next countdown. — Continue Watching, queue and opt-in autoplay-next countdown in Node/member UI.
- **B14 [PARTIAL] P1:** Mobile tap gestures, orientation handling, fullscreen, and touch-accessible controls. — Touch seeking exists; real mobile orientation/fullscreen acceptance missing.
- **B15 [LOCAL] P1:** Playback telemetry: startup time, rebuffer ratio, startup failure, quality shifts, completion. — Opt-in, default-off telemetry now collects startup, startup-failure, rebuffer time and ratio, errors, quality switches, completion. Data aggregated by video/day without user/session/IP identifiers; test coverage and Chromium QA. Production sampling not verified.
- **B16 [NOT_STARTED] P2:** Optional Cast/AirPlay and appropriately licensed offline downloads. — No verified Cast/AirPlay or licensed offline download subsystem.

### C

- **C01 [LOCAL] P1:** Make homepage feeds configurable: Latest, Trending, Top Rated, Subscriptions and For You. — Latest, Trending, Top Rated, Subscriptions and For You feed tabs implemented.
- **C02 [LOCAL] P1:** Add redesigned Watch Later and Favorites with reorder/filter/unwatch controls. — Favorites/Watch Later filters, saved-state actions and bulk removal implemented.
- **C03 [LOCAL] P1:** Expand playlists: create, edit, reorder, privacy, bulk operations and share where permitted. — Playlist creation, reorder, privacy/unlisted sharing and bulk actions implemented.
- **C04 [PARTIAL] P1:** Add cross-device sync for watch progress, settings, subscriptions and viewing history. — Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending.
- **C05 [LOCAL] P1:** Complete subscription bell preferences: all, highlights, off; in-app notification center. — Per-channel All/Highlights/Off modes and private notification center available.
- **C06 [LOCAL] P1:** Improve likes/dislikes, comments, nested replies, pinned comments and spam/report controls. — Likes, threaded replies, pinning and report/moderation functions implemented locally.
- **C07 [LOCAL] P1:** Add a session-based Watch Queue with next/previous, drag reorder and clear. — Private ordered watch queue supports reorder, next/previous and clear.
- **C08 [PARTIAL] P1:** Implement personalized recommendation candidates with safety filtering, dedup and diversity. — Rule-based diversity/safety filters; no large-scale dedup or personalized ranking evaluation.
- **C09 [LOCAL] P1:** Enhance account privacy: history pause, deletion, saved search/history controls, export and deletion. — History pause/delete, opt-in saved searches, account export and deletion pathways.
- **C10 [PARTIAL] P2:** Add watch statistics, optional personal preference profiles and PWA installability. — Offline-only safe shell service worker added, avoiding caching any API/media or user-specific content; actual mobile installability/store-policy validation pending.

### D

- **D01 [LOCAL] P1:** Maintain separate Videos, Categories, Pornstars, Porn Sites, Networks and Channels pages with linked records. — Distinct linked Videos, Categories, Pornstars, Porn Sites, Networks and Channels pages exist.
- **D02 [PARTIAL] P1:** Fix any remaining navigation/parity issues against the user's recordings. — Responsive UI tested offline; exact parity against both supplied recordings not finally signed off.
- **D03 [PARTIAL] P1:** Improve autocomplete with grouped names, aliases, typos, popularity and highlighted matches. — Alias, grouped suggestions, typo alternatives and popularity ordering; search relevance uncalibrated.
- **D04 [PARTIAL] P1:** Add full multi-entity search results and advanced facets for duration, quality, date, site, performer, tag, channel and network. — Multi-entity search and selected facets; complete indexed multi-facet filtering unfinished.
- **D05 [PARTIAL] P1:** Add cursor pagination and stable sort indexes for large catalogs. — Selected SQLite keyset pagination; not all sort/filter combinations or scale validated.
- **D06 [PARTIAL] P1:** Add canonical URLs, public-safe metadata, sitemap policies and duplicate/near-duplicate merging. — Canonical internal links and noindex private preview; no public SEO or safe merge workflow.
- **D07 [LOCAL] P1:** Add hover previews and optimized thumbnails with lazy loading. — Generated 320w/640w responsive WebP posters; rendered srcset/sizes/lazy images, hover preview restores srcset; Chromium offline checks passed at desktop/tablet/mobile.
- **D08 [PARTIAL] P1:** Add follow filters for performers, sites and networks with verified source permissions. — Private follows for performer/site/network; actual source permissions and global feed unfinished.
- **D09 [NOT_STARTED] P1:** Migrate search to OpenSearch only after measuring database-search limits. — Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment.
- **D10 [NOT_STARTED] P2:** Add privacy-respecting embedding similarity, reranking, A/B experiments and cold-start evaluation. — No embeddings training, recommender A/B test or cold-start evaluation.

### E

- **E01 [PARTIAL] P0:** Complete resumable direct-to-private-storage upload and integrity checks with per-user limits. — Local resumable private chunks and checksums work; direct S3 multipart transfer untested.
- **E02 [PARTIAL] P0:** Implement virus scanning, media validation, no-external-protocol FFmpeg sandbox and resource ceilings. — ClamAV fail-closed hook and FFmpeg limits; production isolation/scanning unverified.
- **E03 [PARTIAL] P0:** Add durable processing queues, idempotent jobs, retries, dead-letter queue and progress events. — SQLite durable jobs, lease, retries, local DLQ; no tested SQS worker integration.
- **E04 [BLOCKED] P0:** Require validated rights, adult participant evidence, consent and territory before publish. — Review references and declarations are not independently verified age/consent/licensing evidence.
- **E05 [PARTIAL] P0:** Support takedown/revocation propagation through DB, search, caches, CDN and all assets. — Local hide/holds/outbox and scripted invalidation; real CDN purge and all-copy expiry unverified.
- **E06 [PARTIAL] P1:** Build bulk upload, batch metadata editing, scheduling, drafts and publish review queue. — Batch metadata edits, drafts, planned schedule; no real bulk uploader/auto-publish.
- **E07 [PARTIAL] P1:** Provide thumbnail selection, storyboard generation, subtitle import and video chapters. — Private poster selection, WebVTT and chapters; production storyboard/derivatives unvalidated.
- **E08 [PARTIAL] P1:** Enhance studio analytics: views, qualified watch time, retention, referrals, playback errors. — Opt-in anonymized aggregate creator QoE dashboard with <5-sample suppression; qualified watch time, referral metrics and real creator analytics remain unfinished.
- **E09 [PARTIAL] P1:** Provide channel collaborators with scoped uploader/editor/analyst roles. — Collaborator roles/invitations; upload-role complete authorization not implemented.
- **E10 [PARTIAL] P1:** Add license renewal reminders, dispute history, evidence approval and periodic re-review. — License lifecycle/history/reminders implemented locally; independent evidence review outstanding.

### F

- **F01 [PREPARED] P0:** Start PostgreSQL 16+ in a disposable environment and apply ordered migrations in CI. — Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution.
- **F02 [PARTIAL] P0:** Add full schema constraints, indexes, FKs, immutable audit log strategy and migration rollback scripts. — Added migration 014 with QoE counters and rollback draft; no real PostgreSQL execution or constraints acceptance.
- **F03 [PARTIAL] P0:** Export/import all catalog relationships and verify parity and referential integrity. — Signed catalog export and preflight parity; no actual PostgreSQL import/row-level compare.
- **F04 [PARTIAL] P0:** Migrate accounts, hashes, MFA, sessions, user history, subscriptions, creator/media metadata and moderation with secure handling. — Encrypted SQLite private snapshot export; real identity/MFA/session import unfinished.
- **F05 [PREPARED] P0:** Test concurrent writes, consistency, idempotency, isolation and realistic query performance. — Concurrency test defined for disposable PostgreSQL; not executed here.
- **F06 [PARTIAL] P0:** Build runnable Spring Boot modules for catalog, search, auth, libraries, upload, jobs, moderation and eligibility. — Read-only Spring catalog starter only; full authenticated API suite absent.
- **F07 [NOT_STARTED] P0:** Run Node-vs-Spring API contract and authorization parity tests, including denial cases. — Static route comparison showed 0 matching routes; behavioral parity not established.
- **F08 [NOT_STARTED] P0:** Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback. — No actual shadow reads, live cutover or rollback exercise.
- **F09 [BLOCKED] P0:** Deploy managed database with PITR, encryption, backup policies and restore exercises. — No managed RDS/PITR or provider-side encrypted restore drill.
- **F10 [LOCAL] P1:** Consider a Next.js migration only after core API contracts are stable; it is not a prerequisite for global CDN delivery. — Architecture decision explicitly defers optional Next.js migration pending API parity.

### G

- **G01 [BLOCKED] P0:** Obtain domain registration/renewal details, provider acceptance, AWS account access and billing approval. — No verified owned domain, AWS account authorization or billing/provider approval.
- **G02 [BLOCKED] P0:** Configure least-privilege IAM, deployment roles/OIDC, secrets manager, KMS and budgets/alerts. — Least-privilege/IAM/KMS/budget design only; no real resources deployed.
- **G03 [BLOCKED] P0:** Deploy password-gated synthetic-media staging with protected access and HTTPS. — Password-gated private staging Compose prepared; not deployed/tested on public HTTPS.
- **G04 [BLOCKED] P0:** Configure Route 53 or external registrar DNS, ACM certificates, www/app/media hostnames and redirects. — DNS/ACM runbooks, no owned DNS records or valid custom media certificate.
- **G05 [PREPARED] P0:** Provision private S3 original-media and transcoded-media buckets with lifecycle, encryption and no public ACL. — Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks.
- **G06 [PREPARED] P0:** Deploy two-path CDN/cache rules: static website assets and protected HLS media; use OAC for S3. — CloudFront OAC and uncached manifest template; no provider deployment.
- **G07 [PARTIAL] P0:** Implement short-lived signed HLS cookies/URLs and validate every video entitlement and hold. — Local signed-cookie entitlement and offline signature inspection; no CloudFront validation.
- **G08 [PARTIAL] P0:** Test unsigned/expired/revoked access and source-bucket bypass; rotate keys and invalidate cached assets. — Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS.
- **G09 [PREPARED] P0:** Deploy Spring API behind ALB on ECS/Fargate or appropriately sized VM with health/readiness and autoscaling. — Spring ECS task-definition draft; no service/ALB/autoscaling running.
- **G10 [PREPARED] P0:** Deploy SQS + isolated processing or approved MediaConvert workflow; private event processing. — SQS/DLQ draft; not integrated with media worker/provider.
- **G11 [PARTIAL] P0:** Define region-specific access and content-license rules and deny unauthorized geographies. — Optional HMAC edge country assertion; not all entry points/territory legal rules gated.
- **G12 [PREPARED] P0:** Add WAF, rate limits, DDoS and bot protections at edge, origin and API layers. — Unattached WAF draft and local throttling; not deployed/tuned against attacks.
- **G13 [PREPARED] P0:** Measure global page load, startup/buffering, 403s and CDN cache hit rate from approved regions. — Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry.
- **G14 [PREPARED] P1:** Add lifecycle tiers, cost allocation and egress forecasting; avoid always-on multi-region backends initially. — Cost calculator uses placeholder inputs; no actual AWS bills/rates allocation.
- **G15 [NOT_STARTED] P2:** Evaluate secondary region/multi-AZ DR after proving demand and SLO need. — Multi-region DR decision helper only; no second-region exercises.

### H

- **H01 [BLOCKED] P0, EXTERNAL:** Obtain written legal guidance for where the service can operate and where content can be viewed. — Requires written independent jurisdiction-specific legal opinion.
- **H02 [BLOCKED] P0, EXTERNAL:** Confirm acceptable use with AWS, registrar, CDN, email and payment vendors for intended lawful content. — Requires written terms/provider acceptance for intended use.
- **H03 [BLOCKED] P0, EXTERNAL:** Contract a suitable viewer age-assurance provider and validate live signed API/webhook schemas. — Signed callbacks are local stubs; no contracted age-assurance provider/live schema.
- **H04 [PARTIAL] P0:** Gate every discovery, watch, preview, thumbnail, API, direct media URL, and upload entrypoint as required. — Receipt-gated private demo now protects synthetic poster, MP4 and HLS static paths, tested against direct URL bypass. Real CDN, distributed edge and all preview paths not validated.
- **H05 [PARTIAL] P0:** Bind verification to account/session, enforce expiry and revocation, and minimize sensitive document retention. — Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified.
- **H06 [BLOCKED] P0, EXTERNAL:** Independently verify participant adulthood, informed consent, permitted uses and license provenance. — Independent adulthood, consent and license documentary verification has not occurred.
- **H07 [PARTIAL] P0:** Build documentary storage with encryption, restrictive access, retention, legal holds and revocation. — Evidence references and restricted access design; no audited encrypted documentary vault.
- **H08 [PARTIAL] P0:** Enforce per-video territory/time restrictions and prevent re-publication after revoked/expired rights. — License expiry/hold hides local media; real geography/CDN enforcement missing.
- **H09 [BLOCKED] P0, EXTERNAL:** Complete privacy impact assessment, deletion/retention policies, regulator and legal requirements. — No completed privacy impact assessment or jurisdiction-specific retention legal signoff.
- **H10 [BLOCKED] P0, EXTERNAL:** Run age-assurance effectiveness and bypass testing, provider and independent legal signoff. — No independent age-assurance effectiveness/bypass assessment or legal approval.

### I

- **I01 [PARTIAL] P0:** Harden copyright, consent, age, privacy and emergency intake forms with ticket identifiers and structured evidence. — Structured complaint tickets and opaque references; documentary chain-of-custody lacking.
- **I02 [PARTIAL] P0:** Add reviewer assignment, severities, SLA timers, immutable audit and chain-of-custody evidence. — Local case assignment, priorities, SLA display and audit; no immutable external journal or paging.
- **I03 [PARTIAL] P0:** Connect immediate takedown to all source/rendition/previews, feeds, caches and CDN invalidation. — Local takedowns and CDN invalidation outbox; no real propagation verification.
- **I04 [PARTIAL] P0:** Add uploader notice, appeal, counter-notice and repeat-infringer logic where legally required. — Appeals and decisions exist; legally reviewed counter-notice/repeat-infringer procedure missing.
- **I05 [PARTIAL] P0:** Protect restricted reviewer documents and establish dual-review for sensitive decisions. — Dual admin signoffs for AGE/CONSENT; no independently secured reviewer document vault.
- **I06 [BLOCKED] P0, EXTERNAL:** Train and staff appropriate human moderation, escalation and emergency response. — Human moderator staffing, training, emergency/24-7 coverage unverified.
- **I07 [BLOCKED] P0, EXTERNAL:** Review response times and notices with jurisdiction-specific counsel. — Jurisdiction-specific deadline/SLA legal review has not occurred.
- **I08 [NOT_STARTED] P1:** Add spam/abuse/duplicate detection assistance with human confirmation. — No validated human-reviewed automated spam/abuse detection subsystem.

### J

- **J01 [PARTIAL] P0:** Review threat model and deploy dependency/container/IaC scanning with SBOM. — Basic SBOM/source scans and unrun CI definitions; full container/IaC/CVE scanner unverified.
- **J02 [PARTIAL] P0:** Production MFA for privileged roles, verified email, recovery procedures, session/rate limit tests. — Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent.
- **J03 [PARTIAL] P0:** Complete secret rotation, IAM boundary tests, KMS key policies and audit trail access. — Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested.
- **J04 [BLOCKED] P0:** Run independent penetration test, remediate critical/high findings and retest. — Independent penetration assessment/remediation/retest not performed.
- **J05 [PARTIAL] P0:** Define SLOs for availability, API p95, error rates, video startup, rebuffering and jobs. — Session startup/rebuffer aggregates now exist, but no representative SLO measurement, acceptance targets or production observability evidence.
- **J06 [PARTIAL] P0:** Deploy metrics, traces, logs, alerts, on-call rotations and incident runbooks. — Private metrics and alerts code; no deployed observability or staffed on-call.
- **J07 [BLOCKED] P0:** Perform encrypted DB + S3/KMS complete restore to disposable cloud environment, verify media parity. — Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done.
- **J08 [PARTIAL] P0:** Run realistic concurrency, long soak, cache cold-start, large upload, worker-failure and network-failure tests. — Bounded synthetic localhost load/worker tests; no realistic soak/chaos/perf baseline.
- **J09 [PARTIAL] P0:** Test rollback, failover, release safety, backup retention, domain/TLS renewal and provider downtime. — Local integrity/rollback guidance; real failover, certificate and provider outage test absent.
- **J10 [PARTIAL] P0:** Complete an evidence-based launch checklist requiring real operational/legal/provider signoff. — Fail-closed launch checklist with evidence gate; real legal/provider/operator signatures missing.
- **J11 [PREPARED] P1:** Add cost dashboards, budget thresholds, per-title transcode/storage/egress reporting. — Cost estimates/static calculators only; no real AWS allocation/alerts deployed.
- **J12 [NOT_STARTED] P2:** Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements. — No multi-AZ/multiregion chaos or recovery exercise.

### K

- **K01 [PARTIAL] P2:** Cast/AirPlay and installable PWA (subject to device/platform policy). — PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing.
- **K02 [NOT_STARTED] P2:** AI-assisted captions, metadata and tag suggestions with manual review. — No production AI metadata/caption generation and human validation service.
- **K03 [NOT_STARTED] P2:** Experimental recommendations and A/B testing with privacy safeguards. — No experiments/ranking A/B service.
- **K04 [PARTIAL] P2:** Multi-language interface and regional metadata. — Language preference saved; complete translated/localized interface absent.
- **K05 [NOT_STARTED] P2:** Short-form feed and authorized live streaming as separately designed services. — No short-form or live streaming service.
- **K06 [BLOCKED] P2:** Subscription billing and ad operations only with compatible permitted providers. — No authorized compatible payment/ad provider or billing launch.
- **K07 [NOT_STARTED] P2:** Creator earnings, approved partnerships and deeper analytics. — No verified creator earnings/payout partnership platform.
- **K08 [NOT_STARTED] P2:** Account-controlled offline access to videos with explicit download licenses. — No consent/entitlement-checked encrypted offline download implementation.

