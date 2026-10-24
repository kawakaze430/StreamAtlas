# StreamAtlas checkpoint 46 — cumulative 117-task roadmap

Baseline: v0.45.0 main `59198fe61a2f6083794d47954c034e9f0474e3be`. The CSV retains every historical status column and all 117 unique task IDs. Final source SHA and executed PASS/FAIL/NOT RUN evidence belong to `CODEX_MAIN_TEST_EVIDENCE.md`.

| LOCAL | PARTIAL | PREPARED | BLOCKED | NOT_STARTED | Total |
|---:|---:|---:|---:|---:|---:|
| 28 | 60 | 10 | 19 | 0 | 117 |

B01 alone advances from PARTIAL to LOCAL: the real pinned hls.js bundle, provenance, integrity and license checks now exist and pass their local vendoring acceptance. Other requirements retain their v0.45 status. LOCAL describes the stated local criterion; it grants no cloud, device, provider, legal or public-launch approval.

## Checkpoint 46 engineering scope

- Verified local hls.js 1.7.3, explicit vendored SBOM/advisory audit and CSP-compatible integration.
- Strict 76-operation dynamic contract inventory and wider typed OpenAPI contracts.
- Fenced media-worker attempts, child cancellation, restart/takeover and dead-letter failure tests.
- Offline multipart integrity planning; no provider storage/signing implementation claim.
- Session-authenticated Spring identity/preference reads with guarded PostgreSQL tests.
- Explicitly bounded synthetic loopback shadow reads with no cutover approval.
- Required CI evidence and safe cumulative source packaging.

## Original 62 partial requirements

The original checkpoint-44 partial set remains complete, including A07 and B01 which now have LOCAL implementation status. The companion `qa/partial-acceptance46.json` keeps external production acceptance false for all 62. All other PREPARED/BLOCKED requirements remain in the 117-row CSV.

### Reproducibility, testing and CI

**A03 — P0 — `PARTIAL`**: Add a full Playwright network-browser runner for Chromium, Firefox, WebKit and mobile emulation.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed.

**A05 — P0 — `PARTIAL`**: Run accessibility tests for keyboard, focus, captions, semantic labels, contrast, responsive overflow.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding.

**A06 — P0 — `PARTIAL`**: Define OpenAPI and behavioral contract tests for current Node endpoints before migration.
- v0.46 work: Expanded reviewed dynamic routing from pattern-only acceptance to 76 method/path operations across 62 API regexes and 8 source modules; OpenAPI now 218 operations with typed requests and private-media range contracts. Added synthetic role/CSRF negative-path coverage.
- Evidence: node scripts/qa-dynamic-routes.js --strict; node scripts/qa-route-diff.js --strict; tests/qa-dynamic46.test.js; tests/negative-auth46.test.js. Full final-source outcomes in CODEX_MAIN_TEST_EVIDENCE.md.
- Remaining acceptance: Reviewed literal and dynamic inventory now passes; full route-specific schemas, runtime authorization parity and independent negative-path coverage across every endpoint remain incomplete. Scanner is not a general JavaScript/AST proof.

**A07 — P0 — `LOCAL`**: Build CI gates for API tests, browser tests, migration tests, dependency/audit checks and media fixtures.
- v0.46 work: Made dynamic routing and pinned-vendor verification/audit mandatory CI gates; isolated Java/PostgreSQL account tests from the unit job and require non-skipped, exact-commit evidence. Preserve existing full-row catalog parity and browser/infrastructure jobs.
- Evidence: .github/workflows/ci-main.yml; scripts/ci-summary.py; qa/tests/test_ci_summary.py. Current-SHA hosted results require accessible Actions evidence; no inferred hosted PASS.
- Remaining acceptance: Real hosted CI browser/device/PostgreSQL/SCA gates, successful runs and audit review required.

### Player and media experience

**B01 — P0 — `LOCAL`**: Vendor a reviewed, pinned hls.js version locally with integrity and license verification.
- v0.46 work: Vendored real hls.js 1.7.3 distribution, upstream notice and Apache-2.0 text. Verification pins bundle/license bytes, npm SHA-512 and registry ECDSA signature with an independent pinned registry key; SBOM includes the verified dependency.
- Evidence: node scripts/vendor-hls.js --verify; node scripts/audit-vendored.js; tests/hls-vendor46.test.js; tests/vendor-sbom46.test.js. Bundle SHA-256 a12e7ee1cd64a69dcdb314157e45dafcba705bfb0b1440b7935cb265d374423e. Exact final-source results in CODEX_MAIN_TEST_EVIDENCE.md.
- Remaining acceptance: Local vendoring/integrity/license criterion met for hls.js 1.7.3. Real-browser decoding, adaptive playback, device behavior and independent source security review remain separate B03/B05/B09/J01 acceptance.

**B03 — P0 — `PARTIAL`**: Connect adaptive HLS on Chrome/Firefox/Edge; support native playback on compatible Apple browsers.
- v0.46 work: Locally self-hosted verified hls.js is available to the existing HLS adapter. CSP allows same-origin MSE media blobs; hls.js executes without blob workers and worker-src remains none.
- Evidence: public/assets/vendor/HLS-PROVENANCE.json; public/app.js; actual asset/CSP tests in tests/hls-vendor46.test.js. Real-browser ABR/decoding is separate acceptance.
- Remaining acceptance: Real pinned HLS bundle is integrated with the local adapter and CSP. Actual Chrome/Firefox/Edge/Safari decoding, native fallback and adaptive behavior remain to be demonstrated on the final SHA.

**B04 — P0 — `PARTIAL`**: Create multi-bitrate renditions: lower data-saving, 360p, 480p, 720p, 1080p; 1440p/4K only where source/rights permit.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Full browser ABR, higher-resolution media, cost/performance quotas and cross-device testing pending.

**B05 — P0 — `PARTIAL`**: Test automatic ABR changes under throttled bandwidth and packet loss.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: No observed genuine ABR throttling/packet-loss acceptance.

**B06 — P0 — `PARTIAL`**: Quality settings Auto/manual with position-preserving switching.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Manual MP4 qualities exist; real HLS Auto/variant preservation not proven.

**B07 — P0 — `PARTIAL`**: Player recovery from network stalls, decode failures, expired credentials and variant failure.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Player retry and MP4 fallback code exists; real CDN/network failures not tested.

**B12 — P1 — `PARTIAL`**: Closed-caption selection, track switching, font/appearance settings and language support.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated.

**B14 — P1 — `PARTIAL`**: Mobile tap gestures, orientation handling, fullscreen, and touch-accessible controls.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Touch seeking exists; real mobile orientation/fullscreen acceptance missing.

**B16 — P2 — `PARTIAL`**: Optional Cast/AirPlay and appropriately licensed offline downloads.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: No verified Cast/AirPlay or licensed offline download subsystem.

### Account experience

**C04 — P1 — `PARTIAL`**: Add cross-device sync for watch progress, settings, subscriptions and viewing history.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending.

### Discovery and ranking

**D02 — P1 — `PARTIAL`**: Fix any remaining navigation/parity issues against the user's recordings.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Responsive UI tested offline; exact parity against both supplied recordings not finally signed off.

**D04 — P1 — `PARTIAL`**: Add full multi-entity search results and advanced facets for duration, quality, date, site, performer, tag, channel and network.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Large-catalog search indexing/benchmark and complete metadata taxonomy governance remain pending.

**D06 — P1 — `PARTIAL`**: Add canonical URLs, public-safe metadata, sitemap policies and duplicate/near-duplicate merging.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Canonical SEO/sitemap policy and safe rights-aware merge workflow remain incomplete; candidates are advisory only.

**D08 — P1 — `PARTIAL`**: Add follow filters for performers, sites and networks with verified source permissions.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Private follows for performer/site/network; actual source permissions and global feed unfinished.

**D09 — P1 — `PARTIAL`**: Migrate search to OpenSearch only after measuring database-search limits.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment.

**D10 — P2 — `PARTIAL`**: Add privacy-respecting embedding similarity, reranking, A/B experiments and cold-start evaluation.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: No trained embeddings, live consented A/B experiments or real-user outcomes.

### Uploads and creator tools

**E01 — P0 — `PARTIAL`**: Complete resumable direct-to-private-storage upload and integrity checks with per-user limits.
- v0.46 work: Added bounded offline S3 multipart plans and complete receipt validation: authenticated owner context, exact part boundaries, per-part SHA-256 and provider composite checksum distinct from whole-file integrity. No provider upload/signing or publication occurs.
- Evidence: src/multipart-contract.js; scripts/plan-multipart-upload.js; tests/multipart-contract46.test.js. providerVerified/wholeFileVerified/publicationAuthorized remain false.
- Remaining acceptance: Offline multipart planning is not a durable provider upload. Authenticated provider adapter, remote part storage, resumable multi-host persistence, quotas and end-to-end whole-file verification/restart tests remain incomplete.

**E02 — P0 — `PARTIAL`**: Implement virus scanning, media validation, no-external-protocol FFmpeg sandbox and resource ceilings.
- v0.46 work: AbortSignal propagates into FFmpeg/probe/scanner children; shutdown and lost leases await child close before releasing attempts. Per-attempt staging checks reject symlinks/foreign output.
- Evidence: src/media-safety.js; src/worker-processing.js; tests/worker-resilience46.test.js. Host/container isolation and independent scanner acceptance remain unverified.
- Remaining acceptance: Child cancellation and attempt paths are hardened locally. Production scanner effectiveness, network/host isolation, codec hardening and resource-abuse testing remain unverified.

**E03 — P0 — `PARTIAL`**: Add durable processing queues, idempotent jobs, retries, dead-letter queue and progress events.
- v0.46 work: Fenced lease/attempt identity guards claims, completion and failures in SQLite transactions. Unique private attempt staging prevents stale workers modifying a successor; restart preserves two-attempt dead-letter bounds and removes orphan attempts.
- Evidence: tests/worker-resilience46.test.js covers graceful child cancellation, restart, lease takeover, two crash attempts/dead-letter and symlink/foreign outputs; final regression results in CODEX_MAIN_TEST_EVIDENCE.md.
- Remaining acceptance: SQLite singleton lease/attempt fencing and bounded retries are local. Distributed broker/multi-host idempotency, supervised SIGKILL cleanup, remote observability and power-loss atomicity remain unverified.

**E05 — P0 — `PARTIAL`**: Support takedown/revocation propagation through DB, search, caches, CDN and all assets.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Actual CDN purges and end-to-end revocation test pending.

**E06 — P1 — `PARTIAL`**: Build bulk upload, batch metadata editing, scheduling, drafts and publish review queue.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Bulk actual transfer browser e2e, scheduling automation, production publish/review workflow and cloud direct uploads remain incomplete.

**E08 — P1 — `PARTIAL`**: Enhance studio analytics: views, qualified watch time, retention, referrals, playback errors.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Qualified watch time, detailed audience analytics and real-source reporting remain pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**E09 — P1 — `PARTIAL`**: Provide channel collaborators with scoped uploader/editor/analyst roles.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Full channel team management, delegated upload flow and independent permission audit pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**E10 — P1 — `PARTIAL`**: Add license renewal reminders, dispute history, evidence approval and periodic re-review.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Authentic licensing evidence, renewal and staff re-review pending.

### Database and backend migration

**F02 — P0 — `PARTIAL`**: Add full schema constraints, indexes, FKs, immutable audit log strategy and migration rollback scripts.
- v0.46 work: Preserved all 18 checksum-ledger migrations and disposable full-row catalog importer; Spring session/account reads bind JDBC parameters and honor expired/closed-account exclusions.
- Evidence: scripts/pg-migrations.js; scripts/pg-catalog-import-disposable.js; backend-spring SessionAccountPostgresTest. Full constraint/rollback audit is still pending.
- Remaining acceptance: All 18 protected migrations are retained; complete constraint/privilege/immutable-audit audit, representative-data query validation and rehearsed reversible rollback remain incomplete.

**F03 — P0 — `PARTIAL`**: Export/import all catalog relationships and verify parity and referential integrity.
- v0.46 work: Executed the existing protected ten-table synthetic catalog import against a fresh loopback PostgreSQL 16.15 database: transactional import and exact comparison of every field passed; no private identities or managed database were used.
- Evidence: PASS: node scripts/pg-catalog-import-disposable.js against protected synthetic export. Imported categories28, networks6, sites10, channels10, performers12, videos72 and relationship rows216/144; exact counts/commands/exit codes in CODEX_MAIN_TEST_EVIDENCE.md.
- Remaining acceptance: Ten-table synthetic full-row import is verified locally. Complete schema/relationship coverage under representative migration volumes, independent referential-integrity audit, staged cutover and checkpointed rollback remain incomplete.

**F04 — P0 — `PARTIAL`**: Migrate accounts, hashes, MFA, sessions, user history, subscriptions, creator/media metadata and moderation with secure handling.
- v0.46 work: Spring can read Node-issued SHA-256 session tokens and safe identity/preference fields from the existing PostgreSQL schema; synthetic fixtures prove the read boundary without migrating actual identities or passwords.
- Evidence: SessionAccountControllerTest and guarded SessionAccountPostgresTest. Credential/MFA/history/moderation transfer and recovery are not completed by these read-only endpoints.
- Remaining acceptance: No actual identity/MFA/session/password/private-history transfer is authorized or completed. Full guarded encrypted import, compatibility checks, audit and recovery acceptance remain incomplete.

**F06 — P0 — `PARTIAL`**: Build runnable Spring Boot modules for catalog, search, auth, libraries, upload, jobs, moderation and eligibility.
- v0.46 work: Added real authenticated Spring GET /api/auth/me and GET /api/me/preferences, including expanded fields, Node-compatible defaults, expired/closed/revoked-session denial and sanitized storage errors. No login or write API was added.
- Evidence: PASS: Java21 Maven, 24 unit tests (15 catalog+9 account), plus seven separately enabled real-PostgreSQL16 account integration tests; exact commands/exit codes in CODEX_MAIN_TEST_EVIDENCE.md.
- Remaining acceptance: Spring catalog and two session-authenticated account GET endpoints exist. Login/password/MFA, account writes, libraries, uploads/jobs, moderation and eligibility API implementation remain incomplete.

**F07 — P0 — `PARTIAL`**: Run Node-vs-Spring API contract and authorization parity tests, including denial cases.
- v0.46 work: Implemented two account-read contracts and behavioral authorization tests, including anonymous/expired/closed/revoked and account isolation cases. Added a bounded real-HTTP shadow comparator for those exact routes.
- Evidence: tests/shadow-read46.test.js and Java account tests; actual backend-to-backend outcomes are recorded separately in CODEX_MAIN_TEST_EVIDENCE.md. This does not establish whole-API parity.
- Remaining acceptance: Behavioral parity scope is limited to two account GET endpoints and catalog tests. Whole-API success/denial/schema parity, write/CSRF parity, and independent authorization review remain incomplete.

**F08 — P0 — `PARTIAL`**: Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback.
- v0.46 work: Added opt-in synthetic-only loopback GET shadow reads for /api/auth/me and /api/me/preferences?expanded=1. Refuses redirects, remote/ambiguous origins and excessive bodies; rate limits reads and stores status/count/digests only. Matching server errors fail readiness.
- Evidence: src/shadow-read.js; scripts/shadow-read.js; tests/shadow-read46.test.js. Output always cutoverApproved:false/fullAuthorizationParity:false; no traffic switch or rollback execution.
- Remaining acceptance: Bounded loopback shadow transport is implemented for two account reads; comprehensive traffic shadowing, credential/data migration, failover and checkpointed rollback exercise remain incomplete. No cutover is approved.

### Cloud and regional delivery

**G07 — P0 — `PARTIAL`**: Implement short-lived signed HLS cookies/URLs and validate every video entitlement and hold.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Local signed-cookie entitlement and offline signature inspection; no CloudFront validation.

**G08 — P0 — `PARTIAL`**: Test unsigned/expired/revoked access and source-bucket bypass; rotate keys and invalidate cached assets.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS.

**G11 — P0 — `PARTIAL`**: Define region-specific access and content-license rules and deny unauthorized geographies.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Optional HMAC edge country assertion; not all entry points/territory legal rules gated.

**G15 — P2 — `PARTIAL`**: Evaluate secondary region/multi-AZ DR after proving demand and SLO need.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Multi-region DR decision helper only; no second-region exercises.

### Verification and content rights

**H04 — P0 — `PARTIAL`**: Gate every discovery, watch, preview, thumbnail, API, direct media URL, and upload entrypoint as required.
- v0.46 work: Expanded dynamic method/path inventory and synthetic role/CSRF denial tests while preserving v0.45 rooted private-file authorization.
- Evidence: tests/negative-auth46.test.js; tests/qa-dynamic46.test.js; final source security/authorization regression in CODEX_MAIN_TEST_EVIDENCE.md. Independent region/age bypass review remains mandatory.
- Remaining acceptance: Complete runtime route inventory and independent age/territory bypass audit remain pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**H05 — P0 — `PARTIAL`**: Bind verification to account/session, enforce expiry and revocation, and minimize sensitive document retention.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified.

**H07 — P0 — `PARTIAL`**: Build documentary storage with encryption, restrictive access, retention, legal holds and revocation.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Encrypted documentary vault, legal holds, access logging and independent audit still pending.

**H08 — P0 — `PARTIAL`**: Enforce per-video territory/time restrictions and prevent re-publication after revoked/expired rights.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Full jurisdiction/time access enforcement and revocation on remote CDNs pending.

### Trust and safety operations

**I01 — P0 — `PARTIAL`**: Harden copyright, consent, age, privacy and emergency intake forms with ticket identifiers and structured evidence.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Human intake SOP, legal standing and regulator procedures remain pending.

**I02 — P0 — `PARTIAL`**: Add reviewer assignment, severities, SLA timers, immutable audit and chain-of-custody evidence.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: True staffed SLA and immutable evidence custody acceptance remain pending.

**I03 — P0 — `PARTIAL`**: Connect immediate takedown to all source/rendition/previews, feeds, caches and CDN invalidation.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Actual distributed takedown and cache-purge test pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending.

**I04 — P0 — `PARTIAL`**: Add uploader notice, appeal, counter-notice and repeat-infringer logic where legally required.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Appeals and decisions exist; legally reviewed counter-notice/repeat-infringer procedure missing.

**I05 — P0 — `PARTIAL`**: Protect restricted reviewer documents and establish dual-review for sensitive decisions.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Independent sensitive-case reviewer and documentary access checks pending.

### Security and operations

**J01 — P0 — `PARTIAL`**: Review threat model and deploy dependency/container/IaC scanning with SBOM.
- v0.46 work: Verified vendored hls.js is included in the CycloneDX metadata and dependency audit instead of disappearing behind the root zero-dependency lockfile. Audit exit codes are retained; pin/signature/license tampering fails closed.
- Evidence: scripts/generate-sbom.js; scripts/audit-vendored.js; tests/vendor-sbom46.test.js; tests/hls-vendor46.test.js. Registry advisory results are time-bound and not a source/container/OS audit.
- Remaining acceptance: Vendored dependency provenance/SBOM and advisory audit are covered locally. Independent threat-model/source review and complete container/native/OS/IaC vulnerability scanning and remediation remain outstanding.

**J02 — P0 — `PARTIAL`**: Production MFA for privileged roles, verified email, recovery procedures, session/rate limit tests.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent.

**J03 — P0 — `PARTIAL`**: Complete secret rotation, IAM boundary tests, KMS key policies and audit trail access.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested.

**J06 — P0 — `PARTIAL`**: Deploy metrics, traces, logs, alerts, on-call rotations and incident runbooks.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Production alerting, tracing and staffed on-call remain pending.

**J08 — P0 — `PARTIAL`**: Run realistic concurrency, long soak, cache cold-start, large upload, worker-failure and network-failure tests.
- v0.46 work: Added actual child-process cancellation, worker restart, lease-takeover and two-crash dead-letter tests. SIGKILL test supervisor explicitly kills its recorded orphan encoder; JavaScript cannot clean up after SIGKILL.
- Evidence: tests/worker-resilience46.test.js; real synthetic FFmpeg process tests; CODEX_MAIN_TEST_EVIDENCE.md. Distributed soak and hardened process supervision remain outstanding.
- Remaining acceptance: Local process-failure tests cover cancellation, restart, takeover and bounded crashes. Representative distributed concurrency, long soak, supervision/host failure, network fault and resource-abuse acceptance remain incomplete.

**J09 — P0 — `PARTIAL`**: Test rollback, failover, release safety, backup retention, domain/TLS renewal and provider downtime.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Real AWS KMS/S3 restore, rollback and DNS/failover exercise pending.

**J10 — P0 — `PARTIAL`**: Complete an evidence-based launch checklist requiring real operational/legal/provider signoff.
- v0.46 work: Preserved all 117 tasks and the original 62-item partial acceptance set. Only B01 advances to LOCAL on its specific vendoring criterion; no external acceptance auto-approval.
- Evidence: AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_46.csv; qa/partial-acceptance46.json; docs/PRODUCTION_GATES.md; CODEX_MAIN_TEST_EVIDENCE.md.
- Remaining acceptance: Independent legal, security, provider and operational signoff remain pending.

**J12 — P2 — `PARTIAL`**: Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: No multi-AZ/multiregion chaos or recovery exercise.

### Later product work

**K01 — P2 — `PARTIAL`**: Cast/AirPlay and installable PWA (subject to device/platform policy).
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing.

**K02 — P2 — `PARTIAL`**: AI-assisted captions, metadata and tag suggestions with manual review.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Local tag matching is not AI. Model/provider-assisted caption or metadata suggestions with human review are not implemented.

**K03 — P2 — `PARTIAL`**: Experimental recommendations and A/B testing with privacy safeguards.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Live online randomized assignment, consent management and unbiased business-impact metrics remain unimplemented.

**K04 — P2 — `PARTIAL`**: Multi-language interface and regional metadata.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Language preference saved; complete translated/localized interface absent.

**K05 — P2 — `PARTIAL`**: Short-form feed and authorized live streaming as separately designed services.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: Working local short-clips listing; full vertical feed, authorized live streaming/moderation service and device tests unfinished.

**K07 — P2 — `PARTIAL`**: Creator earnings, approved partnerships and deeper analytics.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: No verified creator earnings/payout partnership platform.

**K08 — P2 — `PARTIAL`**: Account-controlled offline access to videos with explicit download licenses.
- v0.46 work: Retained v0.45 implementation status; no new task-specific acceptance is claimed.
- Evidence: Prior checkpoint evidence retained. See CODEX_MAIN_TEST_EVIDENCE.md for exact final-source checks; no new production acceptance.
- Remaining acceptance: No consent/entitlement-checked encrypted offline download implementation.

## Next implementation priorities

1. Complete guarded synthetic account-data import and additional authenticated Spring read/write modules, with Node-compatible authorization and schema contracts before traffic migration.
2. Build a provider-independent durable upload adapter and multi-host job semantics in disposable tests; do not treat offline multipart receipts as storage evidence.
3. Obtain exact-SHA hosted Chromium/Firefox/WebKit evidence for real HLS decoding, manual/Auto transitions, failure recovery and authorization revocation. Physical Safari/iOS/Android remain separate.
4. Rehearse synthetic checkpointed migration rollback and supervised worker failure under bounded load.
5. Preserve external blockers: no paid resources, real identities/media, provider operations, public deployment or launch without separate explicit authorization and qualified approvals.
