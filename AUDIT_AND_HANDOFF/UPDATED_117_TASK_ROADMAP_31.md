# StreamAtlas Checkpoint 31 — audited 117-task roadmap

**Classification is engineering progress, not production approval.** External-owner work has a separate queue so moving a task to Codex never falsely counts it as complete.

## Engineering status

| Status | Checkpoint 30 | Checkpoint 31 |
|---|---:|---:|
| LOCAL | 22 | 23 |
| PARTIAL | 51 | 51 |
| PREPARED | 10 | 10 |
| BLOCKED | 19 | 19 |
| NOT_STARTED | 15 | 14 |
| **Total** | **117** | **117** |

## Execution queue (separate from completion status)

| Queue | Task count |
|---|---:|
| BLOCKED_CODEX_USER_ENVIRONMENT | 60 |
| BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | 12 |
| LOCAL_ENGINEERING_QUEUE | 22 |
| LOCAL_VERIFIED | 23 |

## Changes delivered locally

- **I08:** Human-reviewed advisory comment abuse detection. Users retain their comments until a moderator explicitly confirms; dismissal and confirmation are audited.
- **D06:** Read-only suspected duplicate video comparisons, explicit human decisions, and no unsafe automatic merge; **remains partial**.
- **A06:** Four additional OpenAPI paths covering comment abuse and duplicates; **remains partial**.
- **F02:** PostgreSQL migration 016 draft describing review records, **not executed on PostgreSQL**.

## Complete task ledger

| ID | P | Engineering status | Execution queue | Unfinished acceptance |
|---|---|---|---|---|
| A01 | P0 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| A02 | P0 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| A03 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed. |
| A04 | P0 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| A05 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding. |
| A06 | P0 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Still partial: broader dynamic route and authorization contracts remain. |
| A07 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | GitHub Actions workflows drafted; full real CI matrix has not been observed passing. |
| A08 | P0 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| B01 | P0 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Pinned reviewed hls.js binary not vendored and audited locally. |
| B02 | P0 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| B03 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Player HLS adapter/native fallback exists; cross-browser adaptive playback not validated. |
| B04 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Synthetic standard/data-saver renditions present; full 360p–1080p adaptive ladder unverified. |
| B05 | P0 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | No observed genuine ABR throttling/packet-loss acceptance. |
| B06 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Manual MP4 qualities exist; real HLS Auto/variant preservation not proven. |
| B07 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Player retry and MP4 fallback code exists; real CDN/network failures not tested. |
| B08 | P0 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Requires live signed HLS manifest/segment/caption revocation testing. |
| B09 | P0 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested. |
| B10 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| B11 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| B12 | P1 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated. |
| B13 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| B14 | P1 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Touch seeking exists; real mobile orientation/fullscreen acceptance missing. |
| B15 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| B16 | P2 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | No verified Cast/AirPlay or licensed offline download subsystem. |
| C01 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| C02 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| C03 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| C04 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending. |
| C05 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| C06 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| C07 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| C08 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Catalog/feed search exclusions strengthened so published videos with open rights/safety holds no longer surface; full-scale personalized candidate evaluation remains unverified. |
| C09 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| C10 | P2 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Offline-only safe shell service worker added, avoiding caching any API/media or user-specific content; actual mobile installability/store-policy validation pending. |
| D01 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| D02 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Responsive UI tested offline; exact parity against both supplied recordings not finally signed off. |
| D03 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| D04 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Added multi-entity facets across categories, performers, sites, networks, channels and qualities, plus actual UI filter controls and consistent safety exclusions; separate independent tag taxonomy and large-catalog search validation still missing. |
| D05 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| D06 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Canonical SEO/sitemap policy and safe rights-aware merge workflow remain incomplete; candidates are advisory only. |
| D07 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| D08 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Private follows for performer/site/network; actual source permissions and global feed unfinished. |
| D09 | P1 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment. |
| D10 | P2 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | No embeddings training, recommender A/B test or cold-start evaluation. |
| E01 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Local resumable private chunks and checksums work; direct S3 multipart transfer untested. |
| E02 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | ClamAV fail-closed hook and FFmpeg limits; production isolation/scanning unverified. |
| E03 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | SQLite durable jobs, lease, retries, local DLQ; no tested SQS worker integration. |
| E04 | P0 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Review references and declarations are not independently verified age/consent/licensing evidence. |
| E05 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Local hide/holds/outbox and scripted invalidation; real CDN purge and all-copy expiry unverified. |
| E06 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Batch metadata edits, drafts, planned schedule; no real bulk uploader/auto-publish. |
| E07 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Private poster selection, WebVTT and chapters; production storyboard/derivatives unvalidated. |
| E08 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Opt-in anonymized aggregate creator QoE dashboard with <5-sample suppression; qualified watch time, referral metrics and real creator analytics remain unfinished. |
| E09 | P1 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Collaborator roles/invitations; upload-role complete authorization not implemented. |
| E10 | P1 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | License lifecycle/history/reminders implemented locally; independent evidence review outstanding. |
| F01 | P0 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution. |
| F02 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Added SQLite views/duration keyset indexes and PostgreSQL migration 015 draft; PostgreSQL execution, rollback and full constraint audits remain external. |
| F03 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Signed catalog export and preflight parity; no actual PostgreSQL import/row-level compare. |
| F04 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Encrypted SQLite private snapshot export; real identity/MFA/session import unfinished. |
| F05 | P0 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Concurrency test defined for disposable PostgreSQL; not executed here. |
| F06 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Read-only Spring catalog starter only; full authenticated API suite absent. |
| F07 | P0 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Static route comparison showed 0 matching routes; behavioral parity not established. |
| F08 | P0 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | No actual shadow reads, live cutover or rollback exercise. |
| F09 | P0 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | No managed RDS/PITR or provider-side encrypted restore drill. |
| F10 | P1 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| G01 | P0 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | No verified owned domain, AWS account authorization or billing/provider approval. |
| G02 | P0 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Least-privilege/IAM/KMS/budget design only; no real resources deployed. |
| G03 | P0 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Password-gated private staging Compose prepared; not deployed/tested on public HTTPS. |
| G04 | P0 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | DNS/ACM runbooks, no owned DNS records or valid custom media certificate. |
| G05 | P0 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks. |
| G06 | P0 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | CloudFront OAC and uncached manifest template; no provider deployment. |
| G07 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Local signed-cookie entitlement and offline signature inspection; no CloudFront validation. |
| G08 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS. |
| G09 | P0 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Spring ECS task-definition draft; no service/ALB/autoscaling running. |
| G10 | P0 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | SQS/DLQ draft; not integrated with media worker/provider. |
| G11 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Optional HMAC edge country assertion; not all entry points/territory legal rules gated. |
| G12 | P0 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Unattached WAF draft and local throttling; not deployed/tuned against attacks. |
| G13 | P0 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry. |
| G14 | P1 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Cost calculator uses placeholder inputs; no actual AWS bills/rates allocation. |
| G15 | P2 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | Multi-region DR decision helper only; no second-region exercises. |
| H01 | P0, EXTERNAL | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Requires written independent jurisdiction-specific legal opinion. |
| H02 | P0, EXTERNAL | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Requires written terms/provider acceptance for intended use. |
| H03 | P0, EXTERNAL | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Signed callbacks are local stubs; no contracted age-assurance provider/live schema. |
| H04 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Shared public video catalog and search suggestions now exclude active safety holds; live CDN/edge bypass validation remains external. |
| H05 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified. |
| H06 | P0, EXTERNAL | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Independent adulthood, consent and license documentary verification has not occurred. |
| H07 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Evidence references and restricted access design; no audited encrypted documentary vault. |
| H08 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | License expiry/hold hides local media; real geography/CDN enforcement missing. |
| H09 | P0, EXTERNAL | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | No completed privacy impact assessment or jurisdiction-specific retention legal signoff. |
| H10 | P0, EXTERNAL | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | No independent age-assurance effectiveness/bypass assessment or legal approval. |
| I01 | P0 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Structured complaint tickets and opaque references; documentary chain-of-custody lacking. |
| I02 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Local case assignment, priorities, SLA display and audit; no immutable external journal or paging. |
| I03 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Local takedowns and CDN invalidation outbox; no real propagation verification. |
| I04 | P0 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Appeals and decisions exist; legally reviewed counter-notice/repeat-infringer procedure missing. |
| I05 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Dual admin signoffs for AGE/CONSENT; no independently secured reviewer document vault. |
| I06 | P0, EXTERNAL | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Human moderator staffing, training, emergency/24-7 coverage unverified. |
| I07 | P0, EXTERNAL | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Jurisdiction-specific deadline/SLA legal review has not occurred. |
| I08 | P1 | LOCAL | LOCAL_VERIFIED | Locally implemented with human decision; operating staffing and production abuse-model evaluation remain separate gates. |
| J01 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Basic SBOM/source scans and unrun CI definitions; full container/IaC/CVE scanner unverified. |
| J02 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent. |
| J03 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested. |
| J04 | P0 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | Independent penetration assessment/remediation/retest not performed. |
| J05 | P0 | LOCAL | LOCAL_VERIFIED | Local implementation complete; external production acceptance is separate. |
| J06 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Private metrics and alerts code; no deployed observability or staffed on-call. |
| J07 | P0 | BLOCKED | BLOCKED_CODEX_USER_ENVIRONMENT | Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done. |
| J08 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Bounded synthetic localhost load/worker tests; no realistic soak/chaos/perf baseline. |
| J09 | P0 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | Local integrity/rollback guidance; real failover, certificate and provider outage test absent. |
| J10 | P0 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Fail-closed launch checklist with evidence gate; real legal/provider/operator signatures missing. |
| J11 | P1 | PREPARED | BLOCKED_CODEX_USER_ENVIRONMENT | Cost estimates/static calculators only; no real AWS allocation/alerts deployed. |
| J12 | P2 | NOT_STARTED | BLOCKED_CODEX_USER_ENVIRONMENT | No multi-AZ/multiregion chaos or recovery exercise. |
| K01 | P2 | PARTIAL | BLOCKED_CODEX_USER_ENVIRONMENT | PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing. |
| K02 | P2 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | No production AI metadata/caption generation and human validation service. |
| K03 | P2 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | No experiments/ranking A/B service. |
| K04 | P2 | PARTIAL | LOCAL_ENGINEERING_QUEUE | Language preference saved; complete translated/localized interface absent. |
| K05 | P2 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | No short-form or live streaming service. |
| K06 | P2 | BLOCKED | BLOCKED_EXTERNAL_PROVIDER_OR_LEGAL | No authorized compatible payment/ad provider or billing launch. |
| K07 | P2 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | No verified creator earnings/payout partnership platform. |
| K08 | P2 | NOT_STARTED | LOCAL_ENGINEERING_QUEUE | No consent/entitlement-checked encrypted offline download implementation. |
