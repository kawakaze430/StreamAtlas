# Codex + User Environment Handoff — Checkpoint 31

This is a blocker register, **not** proof of implementation. The current app is a private, synthetic-media Node/SQLite prototype; public adult-content distribution remains disabled.

## Recommended validation order

1. Commit this cumulative ZIP source into a private Git repository. Run `npm test` and `npm run qa:release:verify` in a fresh checkout; provide exact CI logs.
2. In an isolated disposable environment, run PostgreSQL 16+ and test `npm run db:pg:check`, `npm run db:pg:apply:disposable`, `npm run db:pg:verify:disposable`, then `npm run db:pg:schema`. Never point disposable commands at a real account database.
3. Install and independently audit the pinned hls.js; run network Playwright on Chromium, Firefox and WebKit using `npm run qa:browser:network`, with mobile Safari/Android testing on owned devices.
4. Build the Spring Boot service with Maven, run contract/denial parity and migrate state only with rollback evidence; current Java starter is read-only and not ready for live cutover.
5. For private synthetic-media preview ONLY, authorize an AWS account, domain and billing; test Terraform plan, private S3/CloudFront signed HLS and revoke/expiry paths before any deploy approval.
6. Engage independent identity/rights/compliance/legal vendors and reviewers. **Never create synthetic evidence or label signed demo receipts as certification.**
7. Obtain a documented independent pen test, recovery, monitoring, provider terms review, legal approval and a jurisdiction allowlist before any public-launch consideration.

## Blocked tasks by owner

### BLOCKED_CODEX_USER_ENVIRONMENT
- **A03 [P0]** — Add a full Playwright network-browser runner for Chromium, Firefox, WebKit and mobile emulation.  **Needed:** Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed.
- **A05 [P0]** — Run accessibility tests for keyboard, focus, captions, semantic labels, contrast, responsive overflow.  **Needed:** Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding.
- **A07 [P0]** — Build CI gates for API tests, browser tests, migration tests, dependency/audit checks and media fixtures.  **Needed:** GitHub Actions workflows drafted; full real CI matrix has not been observed passing.
- **B01 [P0]** — Vendor a reviewed, pinned hls.js version locally with integrity and license verification.  **Needed:** Pinned reviewed hls.js binary not vendored and audited locally.
- **B03 [P0]** — Connect adaptive HLS on Chrome/Firefox/Edge; support native playback on compatible Apple browsers.  **Needed:** Player HLS adapter/native fallback exists; cross-browser adaptive playback not validated.
- **B04 [P0]** — Create multi-bitrate renditions: lower data-saving, 360p, 480p, 720p, 1080p; 1440p/4K only where source/rights permit.  **Needed:** Synthetic standard/data-saver renditions present; full 360p–1080p adaptive ladder unverified.
- **B05 [P0]** — Test automatic ABR changes under throttled bandwidth and packet loss.  **Needed:** No observed genuine ABR throttling/packet-loss acceptance.
- **B06 [P0]** — Quality settings Auto/manual with position-preserving switching.  **Needed:** Manual MP4 qualities exist; real HLS Auto/variant preservation not proven.
- **B07 [P0]** — Player recovery from network stalls, decode failures, expired credentials and variant failure.  **Needed:** Player retry and MP4 fallback code exists; real CDN/network failures not tested.
- **B08 [P0]** — Real-playback tests with signed manifests, initialization files, segments and captions after revocation.  **Needed:** Requires live signed HLS manifest/segment/caption revocation testing.
- **B09 [P0]** — Cross-browser/device tests: Chrome, Firefox, Edge, Safari macOS and iOS, Android Chrome.  **Needed:** Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested.
- **B12 [P1]** — Closed-caption selection, track switching, font/appearance settings and language support.  **Needed:** Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated.
- **B14 [P1]** — Mobile tap gestures, orientation handling, fullscreen, and touch-accessible controls.  **Needed:** Touch seeking exists; real mobile orientation/fullscreen acceptance missing.
- **B16 [P2]** — Optional Cast/AirPlay and appropriately licensed offline downloads.  **Needed:** No verified Cast/AirPlay or licensed offline download subsystem.
- **D09 [P1]** — Migrate search to OpenSearch only after measuring database-search limits.  **Needed:** Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment.
- **E01 [P0]** — Complete resumable direct-to-private-storage upload and integrity checks with per-user limits.  **Needed:** Local resumable private chunks and checksums work; direct S3 multipart transfer untested.
- **E02 [P0]** — Implement virus scanning, media validation, no-external-protocol FFmpeg sandbox and resource ceilings.  **Needed:** ClamAV fail-closed hook and FFmpeg limits; production isolation/scanning unverified.
- **E03 [P0]** — Add durable processing queues, idempotent jobs, retries, dead-letter queue and progress events.  **Needed:** SQLite durable jobs, lease, retries, local DLQ; no tested SQS worker integration.
- **E05 [P0]** — Support takedown/revocation propagation through DB, search, caches, CDN and all assets.  **Needed:** Local hide/holds/outbox and scripted invalidation; real CDN purge and all-copy expiry unverified.
- **E10 [P1]** — Add license renewal reminders, dispute history, evidence approval and periodic re-review.  **Needed:** License lifecycle/history/reminders implemented locally; independent evidence review outstanding.
- **F01 [P0]** — Start PostgreSQL 16+ in a disposable environment and apply ordered migrations in CI.  **Needed:** Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution.
- **F02 [P0]** — Add full schema constraints, indexes, FKs, immutable audit log strategy and migration rollback scripts.  **Needed:** Added SQLite views/duration keyset indexes and PostgreSQL migration 015 draft; PostgreSQL execution, rollback and full constraint audits remain external.
- **F03 [P0]** — Export/import all catalog relationships and verify parity and referential integrity.  **Needed:** Signed catalog export and preflight parity; no actual PostgreSQL import/row-level compare.
- **F04 [P0]** — Migrate accounts, hashes, MFA, sessions, user history, subscriptions, creator/media metadata and moderation with secure handling.  **Needed:** Encrypted SQLite private snapshot export; real identity/MFA/session import unfinished.
- **F05 [P0]** — Test concurrent writes, consistency, idempotency, isolation and realistic query performance.  **Needed:** Concurrency test defined for disposable PostgreSQL; not executed here.
- **F06 [P0]** — Build runnable Spring Boot modules for catalog, search, auth, libraries, upload, jobs, moderation and eligibility.  **Needed:** Read-only Spring catalog starter only; full authenticated API suite absent.
- **F07 [P0]** — Run Node-vs-Spring API contract and authorization parity tests, including denial cases.  **Needed:** Static route comparison showed 0 matching routes; behavioral parity not established.
- **F08 [P0]** — Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback.  **Needed:** No actual shadow reads, live cutover or rollback exercise.
- **F09 [P0]** — Deploy managed database with PITR, encryption, backup policies and restore exercises.  **Needed:** No managed RDS/PITR or provider-side encrypted restore drill.
- **G02 [P0]** — Configure least-privilege IAM, deployment roles/OIDC, secrets manager, KMS and budgets/alerts.  **Needed:** Least-privilege/IAM/KMS/budget design only; no real resources deployed.
- **G03 [P0]** — Deploy password-gated synthetic-media staging with protected access and HTTPS.  **Needed:** Password-gated private staging Compose prepared; not deployed/tested on public HTTPS.
- **G04 [P0]** — Configure Route 53 or external registrar DNS, ACM certificates, www/app/media hostnames and redirects.  **Needed:** DNS/ACM runbooks, no owned DNS records or valid custom media certificate.
- **G05 [P0]** — Provision private S3 original-media and transcoded-media buckets with lifecycle, encryption and no public ACL.  **Needed:** Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks.
- **G06 [P0]** — Deploy two-path CDN/cache rules: static website assets and protected HLS media; use OAC for S3.  **Needed:** CloudFront OAC and uncached manifest template; no provider deployment.
- **G07 [P0]** — Implement short-lived signed HLS cookies/URLs and validate every video entitlement and hold.  **Needed:** Local signed-cookie entitlement and offline signature inspection; no CloudFront validation.
- **G08 [P0]** — Test unsigned/expired/revoked access and source-bucket bypass; rotate keys and invalidate cached assets.  **Needed:** Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS.
- **G09 [P0]** — Deploy Spring API behind ALB on ECS/Fargate or appropriately sized VM with health/readiness and autoscaling.  **Needed:** Spring ECS task-definition draft; no service/ALB/autoscaling running.
- **G10 [P0]** — Deploy SQS + isolated processing or approved MediaConvert workflow; private event processing.  **Needed:** SQS/DLQ draft; not integrated with media worker/provider.
- **G11 [P0]** — Define region-specific access and content-license rules and deny unauthorized geographies.  **Needed:** Optional HMAC edge country assertion; not all entry points/territory legal rules gated.
- **G12 [P0]** — Add WAF, rate limits, DDoS and bot protections at edge, origin and API layers.  **Needed:** Unattached WAF draft and local throttling; not deployed/tuned against attacks.
- **G13 [P0]** — Measure global page load, startup/buffering, 403s and CDN cache hit rate from approved regions.  **Needed:** Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry.
- **G14 [P1]** — Add lifecycle tiers, cost allocation and egress forecasting; avoid always-on multi-region backends initially.  **Needed:** Cost calculator uses placeholder inputs; no actual AWS bills/rates allocation.
- **G15 [P2]** — Evaluate secondary region/multi-AZ DR after proving demand and SLO need.  **Needed:** Multi-region DR decision helper only; no second-region exercises.
- **H04 [P0]** — Gate every discovery, watch, preview, thumbnail, API, direct media URL, and upload entrypoint as required.  **Needed:** Shared public video catalog and search suggestions now exclude active safety holds; live CDN/edge bypass validation remains external.
- **H05 [P0]** — Bind verification to account/session, enforce expiry and revocation, and minimize sensitive document retention.  **Needed:** Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified.
- **H07 [P0]** — Build documentary storage with encryption, restrictive access, retention, legal holds and revocation.  **Needed:** Evidence references and restricted access design; no audited encrypted documentary vault.
- **H08 [P0]** — Enforce per-video territory/time restrictions and prevent re-publication after revoked/expired rights.  **Needed:** License expiry/hold hides local media; real geography/CDN enforcement missing.
- **I02 [P0]** — Add reviewer assignment, severities, SLA timers, immutable audit and chain-of-custody evidence.  **Needed:** Local case assignment, priorities, SLA display and audit; no immutable external journal or paging.
- **I03 [P0]** — Connect immediate takedown to all source/rendition/previews, feeds, caches and CDN invalidation.  **Needed:** Local takedowns and CDN invalidation outbox; no real propagation verification.
- **I05 [P0]** — Protect restricted reviewer documents and establish dual-review for sensitive decisions.  **Needed:** Dual admin signoffs for AGE/CONSENT; no independently secured reviewer document vault.
- **J01 [P0]** — Review threat model and deploy dependency/container/IaC scanning with SBOM.  **Needed:** Basic SBOM/source scans and unrun CI definitions; full container/IaC/CVE scanner unverified.
- **J02 [P0]** — Production MFA for privileged roles, verified email, recovery procedures, session/rate limit tests.  **Needed:** Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent.
- **J03 [P0]** — Complete secret rotation, IAM boundary tests, KMS key policies and audit trail access.  **Needed:** Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested.
- **J06 [P0]** — Deploy metrics, traces, logs, alerts, on-call rotations and incident runbooks.  **Needed:** Private metrics and alerts code; no deployed observability or staffed on-call.
- **J07 [P0]** — Perform encrypted DB + S3/KMS complete restore to disposable cloud environment, verify media parity.  **Needed:** Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done.
- **J08 [P0]** — Run realistic concurrency, long soak, cache cold-start, large upload, worker-failure and network-failure tests.  **Needed:** Bounded synthetic localhost load/worker tests; no realistic soak/chaos/perf baseline.
- **J09 [P0]** — Test rollback, failover, release safety, backup retention, domain/TLS renewal and provider downtime.  **Needed:** Local integrity/rollback guidance; real failover, certificate and provider outage test absent.
- **J11 [P1]** — Add cost dashboards, budget thresholds, per-title transcode/storage/egress reporting.  **Needed:** Cost estimates/static calculators only; no real AWS allocation/alerts deployed.
- **J12 [P2]** — Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements.  **Needed:** No multi-AZ/multiregion chaos or recovery exercise.
- **K01 [P2]** — Cast/AirPlay and installable PWA (subject to device/platform policy).  **Needed:** PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing.

### BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL
- **E04 [P0]** — Require validated rights, adult participant evidence, consent and territory before publish.  **Needed:** Review references and declarations are not independently verified age/consent/licensing evidence.
- **G01 [P0]** — Obtain domain registration/renewal details, provider acceptance, AWS account access and billing approval.  **Needed:** No verified owned domain, AWS account authorization or billing/provider approval.
- **H01 [P0, EXTERNAL]** — Obtain written legal guidance for where the service can operate and where content can be viewed.  **Needed:** Requires written independent jurisdiction-specific legal opinion.
- **H02 [P0, EXTERNAL]** — Confirm acceptable use with AWS, registrar, CDN, email and payment vendors for intended lawful content.  **Needed:** Requires written terms/provider acceptance for intended use.
- **H03 [P0, EXTERNAL]** — Contract a suitable viewer age-assurance provider and validate live signed API/webhook schemas.  **Needed:** Signed callbacks are local stubs; no contracted age-assurance provider/live schema.
- **H06 [P0, EXTERNAL]** — Independently verify participant adulthood, informed consent, permitted uses and license provenance.  **Needed:** Independent adulthood, consent and license documentary verification has not occurred.
- **H09 [P0, EXTERNAL]** — Complete privacy impact assessment, deletion/retention policies, regulator and legal requirements.  **Needed:** No completed privacy impact assessment or jurisdiction-specific retention legal signoff.
- **H10 [P0, EXTERNAL]** — Run age-assurance effectiveness and bypass testing, provider and independent legal signoff.  **Needed:** No independent age-assurance effectiveness/bypass assessment or legal approval.
- **I06 [P0, EXTERNAL]** — Train and staff appropriate human moderation, escalation and emergency response.  **Needed:** Human moderator staffing, training, emergency/24-7 coverage unverified.
- **I07 [P0, EXTERNAL]** — Review response times and notices with jurisdiction-specific counsel.  **Needed:** Jurisdiction-specific deadline/SLA legal review has not occurred.
- **J04 [P0]** — Run independent penetration test, remediate critical/high findings and retest.  **Needed:** Independent penetration assessment/remediation/retest not performed.
- **K06 [P2]** — Subscription billing and ad operations only with compatible permitted providers.  **Needed:** No authorized compatible payment/ad provider or billing launch.

