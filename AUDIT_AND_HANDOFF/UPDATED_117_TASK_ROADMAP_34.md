# StreamAtlas — Audited 117-task Roadmap, Checkpoint 34

**Engineering status is separate from approval and ownership.** This checkpoint worked on 20 existing partial tasks. None are promoted to locally complete because their acceptance criteria are broader than the added code and tests.

## Counts

| Engineering state | Tasks |
|---|---:|
| Locally implemented | 23 |
| Partially implemented | 54 |
| Prepared, not executed | 10 |
| Externally blocked | 19 |
| Not started | 11 |
| **Total** | **117** |

## The 20 tasks advanced

| ID | Evidence of work this checkpoint | Still required |
|---|---|---|
| A06 | Operational routes documented in OpenAPI and reviewed against source. | Remaining dynamic routes and schema/authorization parity still need validation. |
| C10 | Owner-only privacy summary for watch progress, search history, playlists and favorites. | Cross-device and platform privacy acceptance remains pending. |
| E01 | Creator-owned upload health view exposes received/expected bytes and stalled state without private paths. | Direct-to-S3 resumable upload, storage quota and external integrity acceptance pending. |
| E03 | Stalled/failed media processing observable via bounded creator operations API. | Distributed durable queue, idempotency and automatic failure recovery remain pending. |
| E05 | Admin-only dry-run removal plan enumerates asset, search, CDN and cache revocation checks without republishing. | Actual CDN purges and end-to-end revocation test pending. |
| E06 | Creator Studio now displays operational statuses from owner-scoped upload health. | Bulk publishing and scheduling automation remain pending. |
| E08 | Creator operations now display upload progress, stalled state and error presence. | Qualified watch time, detailed audience analytics and real-source reporting remain pending. |
| E09 | No cross-account creator upload status access; collaborator authority remains strictly scoped. | Full channel team management, delegated upload flow and independent permission audit pending. |
| E10 | Owner-only rights expiry reminders without leaking documentary references or enabling auto-publish. | Authentic licensing evidence, renewal and staff re-review pending. |
| H04 | Admin content risk audit checks published records with active holds; removal-plan documents protected surfaces. | Complete runtime route inventory and independent age/territory bypass audit remain pending. |
| H07 | Rights reminders and diagnostics omit evidence references, documents and private media paths. | Encrypted documentary vault, legal holds, access logging and independent audit still pending. |
| H08 | Expiring rights audit detects review dates with administrator and creator-facing queues. | Full jurisdiction/time access enforcement and revocation on remote CDNs pending. |
| I01 | Admin triage queue distinguishes active copyright/consent/age/privacy cases and urgent status. | Human intake SOP, legal standing and regulator procedures remain pending. |
| I02 | Human reviewer can change case priority with mandatory rationale, transactional event logging and closed-case denial. | True staffed SLA and immutable evidence custody acceptance remain pending. |
| I03 | Admin-only per-video takedown plan lists all required asset/manifest/search/CDN surfaces without mutating publication. | Actual distributed takedown and cache-purge test pending. |
| I05 | Administrator-only triage/reprioritization does not waive dual-review safeguards. | Independent sensitive-case reviewer and documentary access checks pending. |
| J06 | Readiness summary exposes bounded upload backlogs, expired reviews, held publication hazards and overdue cases. | Production alerting, tracing and staffed on-call remain pending. |
| J08 | Stalled upload flags and bounded counters support targeted chaos/load scenario design. | Real distributed soak, worker failure and rate stress tests pending. |
| J09 | Admin-only recovery readiness checklist summarizes database/private storage status and offline restore steps. | Real AWS KMS/S3 restore, rollback and DNS/failover exercise pending. |
| J10 | Fail-closed operational risk summary explicitly reports publicLaunchApproved=false and never asserts certification. | Independent legal, security, provider and operational signoff remain pending. |

## Full task ledger

| ID | Status | Queue | Requirement / remaining acceptance |
|---|---|---|---|
| A01 | LOCAL | LOCAL_VERIFIED | Snapshot v0.20 and inventory APIs, SQL schema, routes, assets and risks; create a reproducible release manifest. **Next:** Local implementation complete; external production acceptance is separate. |
| A02 | LOCAL | LOCAL_VERIFIED | Record the complete user journey and parity matrix for all currently available workflows. **Next:** Local implementation complete; external production acceptance is separate. |
| A03 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add a full Playwright network-browser runner for Chromium, Firefox, WebKit and mobile emulation. **Next:** Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed. |
| A04 | LOCAL | LOCAL_VERIFIED | Add seeded test accounts (viewer, creator, moderator, administrator) with private ephemeral fixtures. **Next:** Local implementation complete; external production acceptance is separate. |
| A05 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Run accessibility tests for keyboard, focus, captions, semantic labels, contrast, responsive overflow. **Next:** Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding. |
| A06 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Define OpenAPI and behavioral contract tests for current Node endpoints before migration. **Next:** Remaining dynamic routes and schema/authorization parity still need validation. |
| A07 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Build CI gates for API tests, browser tests, migration tests, dependency/audit checks and media fixtures. **Next:** GitHub Actions workflows drafted; full real CI matrix has not been observed passing. |
| A08 | LOCAL | LOCAL_VERIFIED | Add release tagging, change logs, upgrade/rollback plans and failure-oriented integration tests. **Next:** Local implementation complete; external production acceptance is separate. |
| B01 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Vendor a reviewed, pinned hls.js version locally with integrity and license verification. **Next:** Pinned reviewed hls.js binary not vendored and audited locally. |
| B02 | LOCAL | LOCAL_VERIFIED | Validate master HLS playlist, codecs, tracks, formats and content MIME types. **Next:** Local implementation complete; external production acceptance is separate. |
| B03 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Connect adaptive HLS on Chrome/Firefox/Edge; support native playback on compatible Apple browsers. **Next:** Player HLS adapter/native fallback exists; cross-browser adaptive playback not validated. |
| B04 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Create multi-bitrate renditions: lower data-saving, 360p, 480p, 720p, 1080p; 1440p/4K only where source/rights permit. **Next:** Full browser ABR, higher-resolution media, cost/performance quotas and cross-device testing pending. |
| B05 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Test automatic ABR changes under throttled bandwidth and packet loss. **Next:** No observed genuine ABR throttling/packet-loss acceptance. |
| B06 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Quality settings Auto/manual with position-preserving switching. **Next:** Manual MP4 qualities exist; real HLS Auto/variant preservation not proven. |
| B07 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Player recovery from network stalls, decode failures, expired credentials and variant failure. **Next:** Player retry and MP4 fallback code exists; real CDN/network failures not tested. |
| B08 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Real-playback tests with signed manifests, initialization files, segments and captions after revocation. **Next:** Requires live signed HLS manifest/segment/caption revocation testing. |
| B09 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Cross-browser/device tests: Chrome, Firefox, Edge, Safari macOS and iOS, Android Chrome. **Next:** Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested. |
| B10 | LOCAL | LOCAL_VERIFIED | Custom controls: volume, speed, seek, keyboard shortcuts, skip ±10sec, fullscreen, PiP and theater. **Next:** Local implementation complete; external production acceptance is separate. |
| B11 | LOCAL | LOCAL_VERIFIED | Scrub-bar preview storyboards, hover thumbnail previews and timeline chapters. **Next:** Local implementation complete; external production acceptance is separate. |
| B12 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Closed-caption selection, track switching, font/appearance settings and language support. **Next:** Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated. |
| B13 | LOCAL | LOCAL_VERIFIED | Resume position, Continue Watching, playback queue, autoplay-next opt-in and Up Next countdown. **Next:** Local implementation complete; external production acceptance is separate. |
| B14 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Mobile tap gestures, orientation handling, fullscreen, and touch-accessible controls. **Next:** Touch seeking exists; real mobile orientation/fullscreen acceptance missing. |
| B15 | LOCAL | LOCAL_VERIFIED | Playback telemetry: startup time, rebuffer ratio, startup failure, quality shifts, completion. **Next:** Local implementation complete; external production acceptance is separate. |
| B16 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Optional Cast/AirPlay and appropriately licensed offline downloads. **Next:** No verified Cast/AirPlay or licensed offline download subsystem. |
| C01 | LOCAL | LOCAL_VERIFIED | Make homepage feeds configurable: Latest, Trending, Top Rated, Subscriptions and For You. **Next:** Local implementation complete; external production acceptance is separate. |
| C02 | LOCAL | LOCAL_VERIFIED | Add redesigned Watch Later and Favorites with reorder/filter/unwatch controls. **Next:** Local implementation complete; external production acceptance is separate. |
| C03 | LOCAL | LOCAL_VERIFIED | Expand playlists: create, edit, reorder, privacy, bulk operations and share where permitted. **Next:** Local implementation complete; external production acceptance is separate. |
| C04 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add cross-device sync for watch progress, settings, subscriptions and viewing history. **Next:** Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending. |
| C05 | LOCAL | LOCAL_VERIFIED | Complete subscription bell preferences: all, highlights, off; in-app notification center. **Next:** Local implementation complete; external production acceptance is separate. |
| C06 | LOCAL | LOCAL_VERIFIED | Improve likes/dislikes, comments, nested replies, pinned comments and spam/report controls. **Next:** Local implementation complete; external production acceptance is separate. |
| C07 | LOCAL | LOCAL_VERIFIED | Add a session-based Watch Queue with next/previous, drag reorder and clear. **Next:** Local implementation complete; external production acceptance is separate. |
| C08 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Implement personalized recommendation candidates with safety filtering, dedup and diversity. **Next:** Catalog/feed search exclusions strengthened so published videos with open rights/safety holds no longer surface; full-scale personalized candidate evaluation remains unverified. |
| C09 | LOCAL | LOCAL_VERIFIED | Enhance account privacy: history pause, deletion, saved search/history controls, export and deletion. **Next:** Local implementation complete; external production acceptance is separate. |
| C10 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add watch statistics, optional personal preference profiles and PWA installability. **Next:** Cross-device and platform privacy acceptance remains pending. |
| D01 | LOCAL | LOCAL_VERIFIED | Maintain separate Videos, Categories, Pornstars, Porn Sites, Networks and Channels pages with linked records. **Next:** Local implementation complete; external production acceptance is separate. |
| D02 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Fix any remaining navigation/parity issues against the user's recordings. **Next:** Responsive UI tested offline; exact parity against both supplied recordings not finally signed off. |
| D03 | LOCAL | LOCAL_VERIFIED | Improve autocomplete with grouped names, aliases, typos, popularity and highlighted matches. **Next:** Local implementation complete; external production acceptance is separate. |
| D04 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add full multi-entity search results and advanced facets for duration, quality, date, site, performer, tag, channel and network. **Next:** Large-catalog search indexing/benchmark and complete metadata taxonomy governance remain pending. |
| D05 | LOCAL | LOCAL_VERIFIED | Add cursor pagination and stable sort indexes for large catalogs. **Next:** Local implementation complete; external production acceptance is separate. |
| D06 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add canonical URLs, public-safe metadata, sitemap policies and duplicate/near-duplicate merging. **Next:** Canonical SEO/sitemap policy and safe rights-aware merge workflow remain incomplete; candidates are advisory only. |
| D07 | LOCAL | LOCAL_VERIFIED | Add hover previews and optimized thumbnails with lazy loading. **Next:** Local implementation complete; external production acceptance is separate. |
| D08 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add follow filters for performers, sites and networks with verified source permissions. **Next:** Private follows for performer/site/network; actual source permissions and global feed unfinished. |
| D09 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Migrate search to OpenSearch only after measuring database-search limits. **Next:** Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment. |
| D10 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add privacy-respecting embedding similarity, reranking, A/B experiments and cold-start evaluation. **Next:** No trained embeddings, live consented A/B experiments or real-user outcomes. |
| E01 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Complete resumable direct-to-private-storage upload and integrity checks with per-user limits. **Next:** Direct-to-S3 resumable upload, storage quota and external integrity acceptance pending. |
| E02 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Implement virus scanning, media validation, no-external-protocol FFmpeg sandbox and resource ceilings. **Next:** ClamAV fail-closed hook and FFmpeg limits; production isolation/scanning unverified. |
| E03 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add durable processing queues, idempotent jobs, retries, dead-letter queue and progress events. **Next:** Distributed durable queue, idempotency and automatic failure recovery remain pending. |
| E04 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Require validated rights, adult participant evidence, consent and territory before publish. **Next:** Review references and declarations are not independently verified age/consent/licensing evidence. |
| E05 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Support takedown/revocation propagation through DB, search, caches, CDN and all assets. **Next:** Actual CDN purges and end-to-end revocation test pending. |
| E06 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Build bulk upload, batch metadata editing, scheduling, drafts and publish review queue. **Next:** Bulk publishing and scheduling automation remain pending. |
| E07 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Provide thumbnail selection, storyboard generation, subtitle import and video chapters. **Next:** Private poster selection, WebVTT and chapters; production storyboard/derivatives unvalidated. |
| E08 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Enhance studio analytics: views, qualified watch time, retention, referrals, playback errors. **Next:** Qualified watch time, detailed audience analytics and real-source reporting remain pending. |
| E09 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Provide channel collaborators with scoped uploader/editor/analyst roles. **Next:** Full channel team management, delegated upload flow and independent permission audit pending. |
| E10 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add license renewal reminders, dispute history, evidence approval and periodic re-review. **Next:** Authentic licensing evidence, renewal and staff re-review pending. |
| F01 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Start PostgreSQL 16+ in a disposable environment and apply ordered migrations in CI. **Next:** Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution. |
| F02 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add full schema constraints, indexes, FKs, immutable audit log strategy and migration rollback scripts. **Next:** Added SQLite views/duration keyset indexes and PostgreSQL migration 015 draft; PostgreSQL execution, rollback and full constraint audits remain external. |
| F03 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Export/import all catalog relationships and verify parity and referential integrity. **Next:** Signed catalog export and preflight parity; no actual PostgreSQL import/row-level compare. |
| F04 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Migrate accounts, hashes, MFA, sessions, user history, subscriptions, creator/media metadata and moderation with secure handling. **Next:** Encrypted SQLite private snapshot export; real identity/MFA/session import unfinished. |
| F05 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Test concurrent writes, consistency, idempotency, isolation and realistic query performance. **Next:** Concurrency test defined for disposable PostgreSQL; not executed here. |
| F06 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Build runnable Spring Boot modules for catalog, search, auth, libraries, upload, jobs, moderation and eligibility. **Next:** Read-only Spring catalog starter only; full authenticated API suite absent. |
| F07 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | Run Node-vs-Spring API contract and authorization parity tests, including denial cases. **Next:** Static route comparison showed 0 matching routes; behavioral parity not established. |
| F08 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback. **Next:** No actual shadow reads, live cutover or rollback exercise. |
| F09 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Deploy managed database with PITR, encryption, backup policies and restore exercises. **Next:** No managed RDS/PITR or provider-side encrypted restore drill. |
| F10 | LOCAL | LOCAL_VERIFIED | Consider a Next.js migration only after core API contracts are stable; it is not a prerequisite for global CDN delivery. **Next:** Local implementation complete; external production acceptance is separate. |
| G01 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Obtain domain registration/renewal details, provider acceptance, AWS account access and billing approval. **Next:** No verified owned domain, AWS account authorization or billing/provider approval. |
| G02 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Configure least-privilege IAM, deployment roles/OIDC, secrets manager, KMS and budgets/alerts. **Next:** Least-privilege/IAM/KMS/budget design only; no real resources deployed. |
| G03 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Deploy password-gated synthetic-media staging with protected access and HTTPS. **Next:** Password-gated private staging Compose prepared; not deployed/tested on public HTTPS. |
| G04 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Configure Route 53 or external registrar DNS, ACM certificates, www/app/media hostnames and redirects. **Next:** DNS/ACM runbooks, no owned DNS records or valid custom media certificate. |
| G05 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Provision private S3 original-media and transcoded-media buckets with lifecycle, encryption and no public ACL. **Next:** Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks. |
| G06 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Deploy two-path CDN/cache rules: static website assets and protected HLS media; use OAC for S3. **Next:** CloudFront OAC and uncached manifest template; no provider deployment. |
| G07 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Implement short-lived signed HLS cookies/URLs and validate every video entitlement and hold. **Next:** Local signed-cookie entitlement and offline signature inspection; no CloudFront validation. |
| G08 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Test unsigned/expired/revoked access and source-bucket bypass; rotate keys and invalidate cached assets. **Next:** Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS. |
| G09 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Deploy Spring API behind ALB on ECS/Fargate or appropriately sized VM with health/readiness and autoscaling. **Next:** Spring ECS task-definition draft; no service/ALB/autoscaling running. |
| G10 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Deploy SQS + isolated processing or approved MediaConvert workflow; private event processing. **Next:** SQS/DLQ draft; not integrated with media worker/provider. |
| G11 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Define region-specific access and content-license rules and deny unauthorized geographies. **Next:** Optional HMAC edge country assertion; not all entry points/territory legal rules gated. |
| G12 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Add WAF, rate limits, DDoS and bot protections at edge, origin and API layers. **Next:** Unattached WAF draft and local throttling; not deployed/tuned against attacks. |
| G13 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Measure global page load, startup/buffering, 403s and CDN cache hit rate from approved regions. **Next:** Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry. |
| G14 | PREPARED | LOCAL_ENGINEERING_QUEUE | Add lifecycle tiers, cost allocation and egress forecasting; avoid always-on multi-region backends initially. **Next:** Cost calculator uses placeholder inputs; no actual AWS bills/rates allocation. |
| G15 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | Evaluate secondary region/multi-AZ DR after proving demand and SLO need. **Next:** Multi-region DR decision helper only; no second-region exercises. |
| H01 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Obtain written legal guidance for where the service can operate and where content can be viewed. **Next:** Requires written independent jurisdiction-specific legal opinion. |
| H02 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Confirm acceptable use with AWS, registrar, CDN, email and payment vendors for intended lawful content. **Next:** Requires written terms/provider acceptance for intended use. |
| H03 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Contract a suitable viewer age-assurance provider and validate live signed API/webhook schemas. **Next:** Signed callbacks are local stubs; no contracted age-assurance provider/live schema. |
| H04 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Gate every discovery, watch, preview, thumbnail, API, direct media URL, and upload entrypoint as required. **Next:** Complete runtime route inventory and independent age/territory bypass audit remain pending. |
| H05 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Bind verification to account/session, enforce expiry and revocation, and minimize sensitive document retention. **Next:** Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified. |
| H06 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Independently verify participant adulthood, informed consent, permitted uses and license provenance. **Next:** Independent adulthood, consent and license documentary verification has not occurred. |
| H07 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Build documentary storage with encryption, restrictive access, retention, legal holds and revocation. **Next:** Encrypted documentary vault, legal holds, access logging and independent audit still pending. |
| H08 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Enforce per-video territory/time restrictions and prevent re-publication after revoked/expired rights. **Next:** Full jurisdiction/time access enforcement and revocation on remote CDNs pending. |
| H09 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Complete privacy impact assessment, deletion/retention policies, regulator and legal requirements. **Next:** No completed privacy impact assessment or jurisdiction-specific retention legal signoff. |
| H10 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Run age-assurance effectiveness and bypass testing, provider and independent legal signoff. **Next:** No independent age-assurance effectiveness/bypass assessment or legal approval. |
| I01 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Harden copyright, consent, age, privacy and emergency intake forms with ticket identifiers and structured evidence. **Next:** Human intake SOP, legal standing and regulator procedures remain pending. |
| I02 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add reviewer assignment, severities, SLA timers, immutable audit and chain-of-custody evidence. **Next:** True staffed SLA and immutable evidence custody acceptance remain pending. |
| I03 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Connect immediate takedown to all source/rendition/previews, feeds, caches and CDN invalidation. **Next:** Actual distributed takedown and cache-purge test pending. |
| I04 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Add uploader notice, appeal, counter-notice and repeat-infringer logic where legally required. **Next:** Appeals and decisions exist; legally reviewed counter-notice/repeat-infringer procedure missing. |
| I05 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Protect restricted reviewer documents and establish dual-review for sensitive decisions. **Next:** Independent sensitive-case reviewer and documentary access checks pending. |
| I06 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Train and staff appropriate human moderation, escalation and emergency response. **Next:** Human moderator staffing, training, emergency/24-7 coverage unverified. |
| I07 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Review response times and notices with jurisdiction-specific counsel. **Next:** Jurisdiction-specific deadline/SLA legal review has not occurred. |
| I08 | LOCAL | LOCAL_VERIFIED | Add spam/abuse/duplicate detection assistance with human confirmation. **Next:** Locally implemented with human decision; operating staffing and production abuse-model evaluation remain separate gates. |
| J01 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Review threat model and deploy dependency/container/IaC scanning with SBOM. **Next:** Basic SBOM/source scans and unrun CI definitions; full container/IaC/CVE scanner unverified. |
| J02 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Production MFA for privileged roles, verified email, recovery procedures, session/rate limit tests. **Next:** Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent. |
| J03 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Complete secret rotation, IAM boundary tests, KMS key policies and audit trail access. **Next:** Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested. |
| J04 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Run independent penetration test, remediate critical/high findings and retest. **Next:** Independent penetration assessment/remediation/retest not performed. |
| J05 | LOCAL | LOCAL_VERIFIED | Define SLOs for availability, API p95, error rates, video startup, rebuffering and jobs. **Next:** Local implementation complete; external production acceptance is separate. |
| J06 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Deploy metrics, traces, logs, alerts, on-call rotations and incident runbooks. **Next:** Production alerting, tracing and staffed on-call remain pending. |
| J07 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Perform encrypted DB + S3/KMS complete restore to disposable cloud environment, verify media parity. **Next:** Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done. |
| J08 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Run realistic concurrency, long soak, cache cold-start, large upload, worker-failure and network-failure tests. **Next:** Real distributed soak, worker failure and rate stress tests pending. |
| J09 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Test rollback, failover, release safety, backup retention, domain/TLS renewal and provider downtime. **Next:** Real AWS KMS/S3 restore, rollback and DNS/failover exercise pending. |
| J10 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Complete an evidence-based launch checklist requiring real operational/legal/provider signoff. **Next:** Independent legal, security, provider and operational signoff remain pending. |
| J11 | PREPARED | LOCAL_ENGINEERING_QUEUE | Add cost dashboards, budget thresholds, per-title transcode/storage/egress reporting. **Next:** Cost estimates/static calculators only; no real AWS allocation/alerts deployed. |
| J12 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements. **Next:** No multi-AZ/multiregion chaos or recovery exercise. |
| K01 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Cast/AirPlay and installable PWA (subject to device/platform policy). **Next:** PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing. |
| K02 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | AI-assisted captions, metadata and tag suggestions with manual review. **Next:** Local tag matching is not AI. Model/provider-assisted caption or metadata suggestions with human review are not implemented. |
| K03 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Experimental recommendations and A/B testing with privacy safeguards. **Next:** Live online randomized assignment, consent management and unbiased business-impact metrics remain unimplemented. |
| K04 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Multi-language interface and regional metadata. **Next:** Language preference saved; complete translated/localized interface absent. |
| K05 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Short-form feed and authorized live streaming as separately designed services. **Next:** Working local short-clips listing; full vertical feed, authorized live streaming/moderation service and device tests unfinished. |
| K06 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Subscription billing and ad operations only with compatible permitted providers. **Next:** No authorized compatible payment/ad provider or billing launch. |
| K07 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | Creator earnings, approved partnerships and deeper analytics. **Next:** No verified creator earnings/payout partnership platform. |
| K08 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | Account-controlled offline access to videos with explicit download licenses. **Next:** No consent/entitlement-checked encrypted offline download implementation. |
