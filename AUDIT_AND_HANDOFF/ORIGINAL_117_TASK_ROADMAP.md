# StreamAtlas master development roadmap — after v0.20.0

**Scope:** A globally deliverable, authorized, age-restricted video discovery and streaming platform inspired by rich adult-site directories and YouTube-style UX. This is a development plan, not proof of legal authorization or launch readiness. All testing of unapproved features uses original non-explicit synthetic media.

**Baseline:** Cumulative v0.20.0 source; Node 22 + SQLite is the running local backend. Existing catalog, directories, accounts, uploads, FFmpeg processing, simple playlists, recommendations, moderation, local tests and AWS starter files should be preserved. The latest stated baseline is 127 Node tests and an offline Chromium synthetic MP4 playback audit.

**Priorities:** P0 = required before an authorized public launch; P1 = important first-class product improvement; P2 = optional later enhancement. "Not done" includes features that exist only as starter code, prototypes, templates or locally mocked integrations.

## A. Reproducible QA and architecture decisions

- [ ] A01 [P0] Snapshot v0.20 and inventory APIs, SQL schema, routes, assets and risks; create a reproducible release manifest.
- [ ] A02 [P0] Record the complete user journey and parity matrix for all currently available workflows.
- [ ] A03 [P0] Add a full Playwright network-browser runner for Chromium, Firefox, WebKit and mobile emulation.
- [ ] A04 [P0] Add seeded test accounts (viewer, creator, moderator, administrator) with private ephemeral fixtures.
- [ ] A05 [P0] Run accessibility tests for keyboard, focus, captions, semantic labels, contrast, responsive overflow.
- [ ] A06 [P0] Define OpenAPI and behavioral contract tests for current Node endpoints before migration.
- [ ] A07 [P0] Build CI gates for API tests, browser tests, migration tests, dependency/audit checks and media fixtures.
- [ ] A08 [P0] Add release tagging, change logs, upgrade/rollback plans and failure-oriented integration tests.

## B. YouTube-style player and playback reliability

- [ ] B01 [P0] Vendor a reviewed, pinned hls.js version locally with integrity and license verification.
- [ ] B02 [P0] Validate master HLS playlist, codecs, tracks, formats and content MIME types.
- [ ] B03 [P0] Connect adaptive HLS on Chrome/Firefox/Edge; support native playback on compatible Apple browsers.
- [ ] B04 [P0] Create multi-bitrate renditions: lower data-saving, 360p, 480p, 720p, 1080p; 1440p/4K only where source/rights permit.
- [ ] B05 [P0] Test automatic ABR changes under throttled bandwidth and packet loss.
- [ ] B06 [P0] Quality settings Auto/manual with position-preserving switching.
- [ ] B07 [P0] Player recovery from network stalls, decode failures, expired credentials and variant failure.
- [ ] B08 [P0] Real-playback tests with signed manifests, initialization files, segments and captions after revocation.
- [ ] B09 [P0] Cross-browser/device tests: Chrome, Firefox, Edge, Safari macOS and iOS, Android Chrome.
- [ ] B10 [P1] Custom controls: volume, speed, seek, keyboard shortcuts, skip ±10sec, fullscreen, PiP and theater.
- [ ] B11 [P1] Scrub-bar preview storyboards, hover thumbnail previews and timeline chapters.
- [ ] B12 [P1] Closed-caption selection, track switching, font/appearance settings and language support.
- [ ] B13 [P1] Resume position, Continue Watching, playback queue, autoplay-next opt-in and Up Next countdown.
- [ ] B14 [P1] Mobile tap gestures, orientation handling, fullscreen, and touch-accessible controls.
- [ ] B15 [P1] Playback telemetry: startup time, rebuffer ratio, startup failure, quality shifts, completion.
- [ ] B16 [P2] Optional Cast/AirPlay and appropriately licensed offline downloads.

## C. YouTube-style member experience

- [ ] C01 [P1] Make homepage feeds configurable: Latest, Trending, Top Rated, Subscriptions and For You.
- [ ] C02 [P1] Add redesigned Watch Later and Favorites with reorder/filter/unwatch controls.
- [ ] C03 [P1] Expand playlists: create, edit, reorder, privacy, bulk operations and share where permitted.
- [ ] C04 [P1] Add cross-device sync for watch progress, settings, subscriptions and viewing history.
- [ ] C05 [P1] Complete subscription bell preferences: all, highlights, off; in-app notification center.
- [ ] C06 [P1] Improve likes/dislikes, comments, nested replies, pinned comments and spam/report controls.
- [ ] C07 [P1] Add a session-based Watch Queue with next/previous, drag reorder and clear.
- [ ] C08 [P1] Implement personalized recommendation candidates with safety filtering, dedup and diversity.
- [ ] C09 [P1] Enhance account privacy: history pause, deletion, saved search/history controls, export and deletion.
- [ ] C10 [P2] Add watch statistics, optional personal preference profiles and PWA installability.

## D. Directory, catalog, search and recommendation depth

- [ ] D01 [P1] Maintain separate Videos, Categories, Pornstars, Porn Sites, Networks and Channels pages with linked records.
- [ ] D02 [P1] Fix any remaining navigation/parity issues against the user's recordings.
- [ ] D03 [P1] Improve autocomplete with grouped names, aliases, typos, popularity and highlighted matches.
- [ ] D04 [P1] Add full multi-entity search results and advanced facets for duration, quality, date, site, performer, tag, channel and network.
- [ ] D05 [P1] Add cursor pagination and stable sort indexes for large catalogs.
- [ ] D06 [P1] Add canonical URLs, public-safe metadata, sitemap policies and duplicate/near-duplicate merging.
- [ ] D07 [P1] Add hover previews and optimized thumbnails with lazy loading.
- [ ] D08 [P1] Add follow filters for performers, sites and networks with verified source permissions.
- [ ] D09 [P1] Migrate search to OpenSearch only after measuring database-search limits.
- [ ] D10 [P2] Add privacy-respecting embedding similarity, reranking, A/B experiments and cold-start evaluation.

## E. Creator Studio, publishing and media operations

- [ ] E01 [P0] Complete resumable direct-to-private-storage upload and integrity checks with per-user limits.
- [ ] E02 [P0] Implement virus scanning, media validation, no-external-protocol FFmpeg sandbox and resource ceilings.
- [ ] E03 [P0] Add durable processing queues, idempotent jobs, retries, dead-letter queue and progress events.
- [ ] E04 [P0] Require validated rights, adult participant evidence, consent and territory before publish.
- [ ] E05 [P0] Support takedown/revocation propagation through DB, search, caches, CDN and all assets.
- [ ] E06 [P1] Build bulk upload, batch metadata editing, scheduling, drafts and publish review queue.
- [ ] E07 [P1] Provide thumbnail selection, storyboard generation, subtitle import and video chapters.
- [ ] E08 [P1] Enhance studio analytics: views, qualified watch time, retention, referrals, playback errors.
- [ ] E09 [P1] Provide channel collaborators with scoped uploader/editor/analyst roles.
- [ ] E10 [P1] Add license renewal reminders, dispute history, evidence approval and periodic re-review.

## F. PostgreSQL + backend modernization

- [ ] F01 [P0] Start PostgreSQL 16+ in a disposable environment and apply ordered migrations in CI.
- [ ] F02 [P0] Add full schema constraints, indexes, FKs, immutable audit log strategy and migration rollback scripts.
- [ ] F03 [P0] Export/import all catalog relationships and verify parity and referential integrity.
- [ ] F04 [P0] Migrate accounts, hashes, MFA, sessions, user history, subscriptions, creator/media metadata and moderation with secure handling.
- [ ] F05 [P0] Test concurrent writes, consistency, idempotency, isolation and realistic query performance.
- [ ] F06 [P0] Build runnable Spring Boot modules for catalog, search, auth, libraries, upload, jobs, moderation and eligibility.
- [ ] F07 [P0] Run Node-vs-Spring API contract and authorization parity tests, including denial cases.
- [ ] F08 [P0] Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback.
- [ ] F09 [P0] Deploy managed database with PITR, encryption, backup policies and restore exercises.
- [ ] F10 [P1] Consider a Next.js migration only after core API contracts are stable; it is not a prerequisite for global CDN delivery.

## G. Worldwide AWS video delivery and domains

- [ ] G01 [P0] Obtain domain registration/renewal details, provider acceptance, AWS account access and billing approval.
- [ ] G02 [P0] Configure least-privilege IAM, deployment roles/OIDC, secrets manager, KMS and budgets/alerts.
- [ ] G03 [P0] Deploy password-gated synthetic-media staging with protected access and HTTPS.
- [ ] G04 [P0] Configure Route 53 or external registrar DNS, ACM certificates, www/app/media hostnames and redirects.
- [ ] G05 [P0] Provision private S3 original-media and transcoded-media buckets with lifecycle, encryption and no public ACL.
- [ ] G06 [P0] Deploy two-path CDN/cache rules: static website assets and protected HLS media; use OAC for S3.
- [ ] G07 [P0] Implement short-lived signed HLS cookies/URLs and validate every video entitlement and hold.
- [ ] G08 [P0] Test unsigned/expired/revoked access and source-bucket bypass; rotate keys and invalidate cached assets.
- [ ] G09 [P0] Deploy Spring API behind ALB on ECS/Fargate or appropriately sized VM with health/readiness and autoscaling.
- [ ] G10 [P0] Deploy SQS + isolated processing or approved MediaConvert workflow; private event processing.
- [ ] G11 [P0] Define region-specific access and content-license rules and deny unauthorized geographies.
- [ ] G12 [P0] Add WAF, rate limits, DDoS and bot protections at edge, origin and API layers.
- [ ] G13 [P0] Measure global page load, startup/buffering, 403s and CDN cache hit rate from approved regions.
- [ ] G14 [P1] Add lifecycle tiers, cost allocation and egress forecasting; avoid always-on multi-region backends initially.
- [ ] G15 [P2] Evaluate secondary region/multi-AZ DR after proving demand and SLO need.

## H. Age, consent, license and privacy compliance launch gates

- [ ] H01 [P0, EXTERNAL] Obtain written legal guidance for where the service can operate and where content can be viewed.
- [ ] H02 [P0, EXTERNAL] Confirm acceptable use with AWS, registrar, CDN, email and payment vendors for intended lawful content.
- [ ] H03 [P0, EXTERNAL] Contract a suitable viewer age-assurance provider and validate live signed API/webhook schemas.
- [ ] H04 [P0] Gate every discovery, watch, preview, thumbnail, API, direct media URL, and upload entrypoint as required.
- [ ] H05 [P0] Bind verification to account/session, enforce expiry and revocation, and minimize sensitive document retention.
- [ ] H06 [P0, EXTERNAL] Independently verify participant adulthood, informed consent, permitted uses and license provenance.
- [ ] H07 [P0] Build documentary storage with encryption, restrictive access, retention, legal holds and revocation.
- [ ] H08 [P0] Enforce per-video territory/time restrictions and prevent re-publication after revoked/expired rights.
- [ ] H09 [P0, EXTERNAL] Complete privacy impact assessment, deletion/retention policies, regulator and legal requirements.
- [ ] H10 [P0, EXTERNAL] Run age-assurance effectiveness and bypass testing, provider and independent legal signoff.

## I. Moderation, copyright and escalation

- [ ] I01 [P0] Harden copyright, consent, age, privacy and emergency intake forms with ticket identifiers and structured evidence.
- [ ] I02 [P0] Add reviewer assignment, severities, SLA timers, immutable audit and chain-of-custody evidence.
- [ ] I03 [P0] Connect immediate takedown to all source/rendition/previews, feeds, caches and CDN invalidation.
- [ ] I04 [P0] Add uploader notice, appeal, counter-notice and repeat-infringer logic where legally required.
- [ ] I05 [P0] Protect restricted reviewer documents and establish dual-review for sensitive decisions.
- [ ] I06 [P0, EXTERNAL] Train and staff appropriate human moderation, escalation and emergency response.
- [ ] I07 [P0, EXTERNAL] Review response times and notices with jurisdiction-specific counsel.
- [ ] I08 [P1] Add spam/abuse/duplicate detection assistance with human confirmation.

## J. Security, reliability, operations and release readiness

- [ ] J01 [P0] Review threat model and deploy dependency/container/IaC scanning with SBOM.
- [ ] J02 [P0] Production MFA for privileged roles, verified email, recovery procedures, session/rate limit tests.
- [ ] J03 [P0] Complete secret rotation, IAM boundary tests, KMS key policies and audit trail access.
- [ ] J04 [P0] Run independent penetration test, remediate critical/high findings and retest.
- [ ] J05 [P0] Define SLOs for availability, API p95, error rates, video startup, rebuffering and jobs.
- [ ] J06 [P0] Deploy metrics, traces, logs, alerts, on-call rotations and incident runbooks.
- [ ] J07 [P0] Perform encrypted DB + S3/KMS complete restore to disposable cloud environment, verify media parity.
- [ ] J08 [P0] Run realistic concurrency, long soak, cache cold-start, large upload, worker-failure and network-failure tests.
- [ ] J09 [P0] Test rollback, failover, release safety, backup retention, domain/TLS renewal and provider downtime.
- [ ] J10 [P0] Complete an evidence-based launch checklist requiring real operational/legal/provider signoff.
- [ ] J11 [P1] Add cost dashboards, budget thresholds, per-title transcode/storage/egress reporting.
- [ ] J12 [P2] Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements.

## K. Optional later additions (not launch blockers)

- [ ] K01 [P2] Cast/AirPlay and installable PWA (subject to device/platform policy).
- [ ] K02 [P2] AI-assisted captions, metadata and tag suggestions with manual review.
- [ ] K03 [P2] Experimental recommendations and A/B testing with privacy safeguards.
- [ ] K04 [P2] Multi-language interface and regional metadata.
- [ ] K05 [P2] Short-form feed and authorized live streaming as separately designed services.
- [ ] K06 [P2] Subscription billing and ad operations only with compatible permitted providers.
- [ ] K07 [P2] Creator earnings, approved partnerships and deeper analytics.
- [ ] K08 [P2] Account-controlled offline access to videos with explicit download licenses.

## Proposed milestones / acceptance order

| Milestone | Focus | Acceptance gate |
|---|---|---|
| 21 | True HLS/ABR browser player and playback QA | Automatic bitrate switching and recovery in Chrome, Firefox, Safari/iOS; signed segment and caption tests |
| 22 | YouTube-style member and discovery polish | Queue, playlists, autoplay, subscriptions, better search and responsive E2E |
| 23 | Creator processing and metadata | Authorized upload → scan → transcode → verify → approve → stream; idempotency and revocation |
| 24 | PostgreSQL migration | All migrations execute and all catalog/user/review records pass parity and rollback drills |
| 25 | Spring Boot API cutover | Complete API coverage and contract parity; frontend uses Spring while old APIs are retired safely |
| 26 | Private S3/CDN media | Signed streaming, OAC, invalidation, expired/revoked denies on real AWS staging |
| 27 | Private worldwide preview/domain | Real domain/TLS, global static asset/media CDN, protected synthetic catalog, cost alerts |
| 28 | External verification and moderation | Approved providers, human evidence review, legal/regional go-no-go and takedown operations |
| 29 | Security/reliability/load | Independent pentest, AWS recovery drill, monitoring/on-call, realistic load/soak |
| 30 | Public release decision | All mandatory gates signed off for explicitly allowed countries; otherwise stay private |
| 31+ | Optional enhancements | Search/AI/PWA/Live/Billing only after appropriate validation |

**Deployment stages:** (1) local tests → (2) private AWS synthetic preview → (3) authorized regional beta → (4) regional expansion after legal, provider, security and performance proof. Never interpret global CDN reach as legal permission in every country.

**Integration strategy:** Keep the verified Node+SQLite app available until the new Spring+PostgreSQL service passes identical contract tests and complete migration/rollback checks. Use original non-explicit media for every unapproved staging test. The CloudFront edge network can serve global video without day-one globally distributed database writes. Validate AWS policies and pricing at the moment of provisioning.
