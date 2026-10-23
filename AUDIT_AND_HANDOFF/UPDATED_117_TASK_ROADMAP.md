# StreamAtlas Checkpoint 38 — 117-task engineering roadmap

**Scope:** synthetic-only private local prototype. LOCAL never implies public launch approval.

| Classification | Checkpoint 37 | Checkpoint 38 |
|---|---:|---:|
| LOCAL | 26 | 26 |
| PARTIAL | 51 | 51 |
| PREPARED | 10 | 10 |
| BLOCKED | 19 | 19 |
| NOT_STARTED | 11 | 11 |
| **Total** | **117** | **117** |

## Checkpoint 38 change

- **A06 PARTIAL:** 11 regex upload operations added to OpenAPI and transport schema reviewed; previously 173 → **184** operations. Other dynamic routes missing.
- **E01 PARTIAL:** crash-safe *single writer* byte-for-byte chunk replay and fsync-before-SQL-commit, new negative tests; cloud/distributed multipart still pending.
- **No promotions:** no external PostgreSQL, Maven, full-browser, AWS, legal/provider/pentesting acceptance done.

## Individual ledger

| Task | Priority | Status | Remaining acceptance | New checkpoint evidence |
|---|---|---|---|---|
| A01 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| A02 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| A03 | P0 | PARTIAL | Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed. | No checkpoint-38 implementation-status change. |
| A04 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| A05 | P0 | PARTIAL | Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding. | No checkpoint-38 implementation-status change. |
| A06 | P0 | PARTIAL | Other dynamic regex routes, all route-specific schema parity, full negative access tests, actual hosted CI pending. 11 upload dynamic operations now reviewed; literal static scanner is not complete discovery. | Reviewed 11 dynamic upload-regex operations (173 to 184 OAS), added binary chunk transport/typed replay receipt. Other dynamic and typed parity incomplete. |
| A07 | P0 | PARTIAL | Real hosted CI browser/device/PostgreSQL/SCA gates, successful runs and audit review required. | No checkpoint-38 implementation-status change. |
| A08 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| B01 | P0 | NOT_STARTED | Pinned reviewed hls.js binary not vendored and audited locally. | No checkpoint-38 implementation-status change. |
| B02 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| B03 | P0 | PARTIAL | Player HLS adapter/native fallback exists; cross-browser adaptive playback not validated. | No checkpoint-38 implementation-status change. |
| B04 | P0 | PARTIAL | Full browser ABR, higher-resolution media, cost/performance quotas and cross-device testing pending. | No checkpoint-38 implementation-status change. |
| B05 | P0 | NOT_STARTED | No observed genuine ABR throttling/packet-loss acceptance. | No checkpoint-38 implementation-status change. |
| B06 | P0 | PARTIAL | Manual MP4 qualities exist; real HLS Auto/variant preservation not proven. | No checkpoint-38 implementation-status change. |
| B07 | P0 | PARTIAL | Player retry and MP4 fallback code exists; real CDN/network failures not tested. | No checkpoint-38 implementation-status change. |
| B08 | P0 | BLOCKED | Requires live signed HLS manifest/segment/caption revocation testing. | No checkpoint-38 implementation-status change. |
| B09 | P0 | BLOCKED | Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested. | No checkpoint-38 implementation-status change. |
| B10 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| B11 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| B12 | P1 | PARTIAL | Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated. | No checkpoint-38 implementation-status change. |
| B13 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| B14 | P1 | PARTIAL | Touch seeking exists; real mobile orientation/fullscreen acceptance missing. | No checkpoint-38 implementation-status change. |
| B15 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| B16 | P2 | NOT_STARTED | No verified Cast/AirPlay or licensed offline download subsystem. | No checkpoint-38 implementation-status change. |
| C01 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| C02 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| C03 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| C04 | P1 | PARTIAL | Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending. | No checkpoint-38 implementation-status change. |
| C05 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| C06 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| C07 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| C08 | P1 | LOCAL | Local candidate ranking, safety filtering, deduplication and diversity implemented and verified. Large-scale outcomes, advanced embedding experiments and consented A/B tests remain separately tracked under D10/K03. | No checkpoint-38 implementation-status change. |
| C09 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| C10 | P2 | LOCAL | Actual mobile install/privacy behavior and production sync remain external acceptance; local engineering criterion met. | No checkpoint-38 implementation-status change. |
| D01 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| D02 | P1 | PARTIAL | Responsive UI tested offline; exact parity against both supplied recordings not finally signed off. | No checkpoint-38 implementation-status change. |
| D03 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| D04 | P1 | PARTIAL | Large-catalog search indexing/benchmark and complete metadata taxonomy governance remain pending. | No checkpoint-38 implementation-status change. |
| D05 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| D06 | P1 | PARTIAL | Canonical SEO/sitemap policy and safe rights-aware merge workflow remain incomplete; candidates are advisory only. | No checkpoint-38 implementation-status change. |
| D07 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| D08 | P1 | PARTIAL | Private follows for performer/site/network; actual source permissions and global feed unfinished. | No checkpoint-38 implementation-status change. |
| D09 | P1 | NOT_STARTED | Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment. | No checkpoint-38 implementation-status change. |
| D10 | P2 | PARTIAL | No trained embeddings, live consented A/B experiments or real-user outcomes. | No checkpoint-38 implementation-status change. |
| E01 | P0 | PARTIAL | Multi-host lock or S3 multipart durable uploads, secure object quotas and cloud integrity/restart failure tests pending. Single-writer SQLite crash replay locally hardened. | Implemented private single-writer durable chunk recovery: fsync-before-commit, byte-exact idempotent retry, disk-ahead spool reconciliation and fail-closed corruption/symlink checks. Does NOT include distributed multipart or S3. |
| E02 | P0 | PARTIAL | ClamAV fail-closed hook and FFmpeg limits; production isolation/scanning unverified. | No checkpoint-38 implementation-status change. |
| E03 | P0 | PARTIAL | Distributed broker, full worker process chaos tests, supervised rollout and remote observability still pending. | No checkpoint-38 implementation-status change. |
| E04 | P0 | BLOCKED | Review references and declarations are not independently verified age/consent/licensing evidence. | No checkpoint-38 implementation-status change. |
| E05 | P0 | PARTIAL | Actual CDN purges and end-to-end revocation test pending. | No checkpoint-38 implementation-status change. |
| E06 | P1 | PARTIAL | Bulk actual transfer browser e2e, scheduling automation, production publish/review workflow and cloud direct uploads remain incomplete. | No checkpoint-38 implementation-status change. |
| E07 | P1 | LOCAL | Large-scale media and live CDN caching require external acceptance; local feature criterion met. | No checkpoint-38 implementation-status change. |
| E08 | P1 | PARTIAL | Qualified watch time, detailed audience analytics and real-source reporting remain pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending. | No checkpoint-38 implementation-status change. |
| E09 | P1 | PARTIAL | Full channel team management, delegated upload flow and independent permission audit pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending. | No checkpoint-38 implementation-status change. |
| E10 | P1 | PARTIAL | Authentic licensing evidence, renewal and staff re-review pending. | No checkpoint-38 implementation-status change. |
| F01 | P0 | PREPARED | Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution. | No checkpoint-38 implementation-status change. |
| F02 | P0 | PARTIAL | Added SQLite views/duration keyset indexes and PostgreSQL migration 015 draft; PostgreSQL execution, rollback and full constraint audits remain external. | No checkpoint-38 implementation-status change. |
| F03 | P0 | PARTIAL | Signed catalog export and preflight parity; no actual PostgreSQL import/row-level compare. | No checkpoint-38 implementation-status change. |
| F04 | P0 | PARTIAL | Encrypted SQLite private snapshot export; real identity/MFA/session import unfinished. | No checkpoint-38 implementation-status change. |
| F05 | P0 | PREPARED | Concurrency test defined for disposable PostgreSQL; not executed here. | No checkpoint-38 implementation-status change. |
| F06 | P0 | PARTIAL | Read-only Spring catalog starter only; full authenticated API suite absent. | No checkpoint-38 implementation-status change. |
| F07 | P0 | NOT_STARTED | Static route comparison showed 0 matching routes; behavioral parity not established. | No checkpoint-38 implementation-status change. |
| F08 | P0 | NOT_STARTED | No actual shadow reads, live cutover or rollback exercise. | No checkpoint-38 implementation-status change. |
| F09 | P0 | BLOCKED | No managed RDS/PITR or provider-side encrypted restore drill. | No checkpoint-38 implementation-status change. |
| F10 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| G01 | P0 | BLOCKED | No verified owned domain, AWS account authorization or billing/provider approval. | No checkpoint-38 implementation-status change. |
| G02 | P0 | BLOCKED | Least-privilege/IAM/KMS/budget design only; no real resources deployed. | No checkpoint-38 implementation-status change. |
| G03 | P0 | BLOCKED | Password-gated private staging Compose prepared; not deployed/tested on public HTTPS. | No checkpoint-38 implementation-status change. |
| G04 | P0 | BLOCKED | DNS/ACM runbooks, no owned DNS records or valid custom media certificate. | No checkpoint-38 implementation-status change. |
| G05 | P0 | PREPARED | Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks. | No checkpoint-38 implementation-status change. |
| G06 | P0 | PREPARED | CloudFront OAC and uncached manifest template; no provider deployment. | No checkpoint-38 implementation-status change. |
| G07 | P0 | PARTIAL | Local signed-cookie entitlement and offline signature inspection; no CloudFront validation. | No checkpoint-38 implementation-status change. |
| G08 | P0 | PARTIAL | Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS. | No checkpoint-38 implementation-status change. |
| G09 | P0 | PREPARED | Spring ECS task-definition draft; no service/ALB/autoscaling running. | No checkpoint-38 implementation-status change. |
| G10 | P0 | PREPARED | SQS/DLQ draft; not integrated with media worker/provider. | No checkpoint-38 implementation-status change. |
| G11 | P0 | PARTIAL | Optional HMAC edge country assertion; not all entry points/territory legal rules gated. | No checkpoint-38 implementation-status change. |
| G12 | P0 | PREPARED | Unattached WAF draft and local throttling; not deployed/tuned against attacks. | No checkpoint-38 implementation-status change. |
| G13 | P0 | PREPARED | Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry. | No checkpoint-38 implementation-status change. |
| G14 | P1 | PREPARED | Cost calculator uses placeholder inputs; no actual AWS bills/rates allocation. | No checkpoint-38 implementation-status change. |
| G15 | P2 | NOT_STARTED | Multi-region DR decision helper only; no second-region exercises. | No checkpoint-38 implementation-status change. |
| H01 | P0, EXTERNAL | BLOCKED | Requires written independent jurisdiction-specific legal opinion. | No checkpoint-38 implementation-status change. |
| H02 | P0, EXTERNAL | BLOCKED | Requires written terms/provider acceptance for intended use. | No checkpoint-38 implementation-status change. |
| H03 | P0, EXTERNAL | BLOCKED | Signed callbacks are local stubs; no contracted age-assurance provider/live schema. | No checkpoint-38 implementation-status change. |
| H04 | P0 | PARTIAL | Complete runtime route inventory and independent age/territory bypass audit remain pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending. | No checkpoint-38 implementation-status change. |
| H05 | P0 | PARTIAL | Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified. | No checkpoint-38 implementation-status change. |
| H06 | P0, EXTERNAL | BLOCKED | Independent adulthood, consent and license documentary verification has not occurred. | No checkpoint-38 implementation-status change. |
| H07 | P0 | PARTIAL | Encrypted documentary vault, legal holds, access logging and independent audit still pending. | No checkpoint-38 implementation-status change. |
| H08 | P0 | PARTIAL | Full jurisdiction/time access enforcement and revocation on remote CDNs pending. | No checkpoint-38 implementation-status change. |
| H09 | P0, EXTERNAL | BLOCKED | No completed privacy impact assessment or jurisdiction-specific retention legal signoff. | No checkpoint-38 implementation-status change. |
| H10 | P0, EXTERNAL | BLOCKED | No independent age-assurance effectiveness/bypass assessment or legal approval. | No checkpoint-38 implementation-status change. |
| I01 | P0 | PARTIAL | Human intake SOP, legal standing and regulator procedures remain pending. | No checkpoint-38 implementation-status change. |
| I02 | P0 | PARTIAL | True staffed SLA and immutable evidence custody acceptance remain pending. | No checkpoint-38 implementation-status change. |
| I03 | P0 | PARTIAL | Actual distributed takedown and cache-purge test pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending. | No checkpoint-38 implementation-status change. |
| I04 | P0 | PARTIAL | Appeals and decisions exist; legally reviewed counter-notice/repeat-infringer procedure missing. | No checkpoint-38 implementation-status change. |
| I05 | P0 | PARTIAL | Independent sensitive-case reviewer and documentary access checks pending. | No checkpoint-38 implementation-status change. |
| I06 | P0, EXTERNAL | BLOCKED | Human moderator staffing, training, emergency/24-7 coverage unverified. | No checkpoint-38 implementation-status change. |
| I07 | P0, EXTERNAL | BLOCKED | Jurisdiction-specific deadline/SLA legal review has not occurred. | No checkpoint-38 implementation-status change. |
| I08 | P1 | LOCAL | Locally implemented with human decision; operating staffing and production abuse-model evaluation remain separate gates. | No checkpoint-38 implementation-status change. |
| J01 | P0 | PARTIAL | Basic SBOM/source scans and unrun CI definitions; full container/IaC/CVE scanner unverified. | No checkpoint-38 implementation-status change. |
| J02 | P0 | PARTIAL | Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent. | No checkpoint-38 implementation-status change. |
| J03 | P0 | PARTIAL | Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested. | No checkpoint-38 implementation-status change. |
| J04 | P0 | BLOCKED | Independent penetration assessment/remediation/retest not performed. | No checkpoint-38 implementation-status change. |
| J05 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | No checkpoint-38 implementation-status change. |
| J06 | P0 | PARTIAL | Production alerting, tracing and staffed on-call remain pending. | No checkpoint-38 implementation-status change. |
| J07 | P0 | BLOCKED | Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done. | No checkpoint-38 implementation-status change. |
| J08 | P0 | PARTIAL | Real distributed soak, worker failure and rate stress tests pending. | No checkpoint-38 implementation-status change. |
| J09 | P0 | PARTIAL | Real AWS KMS/S3 restore, rollback and DNS/failover exercise pending. | No checkpoint-38 implementation-status change. |
| J10 | P0 | PARTIAL | Independent legal, security, provider and operational signoff remain pending. | No checkpoint-38 implementation-status change. |
| J11 | P1 | PREPARED | Cost estimates/static calculators only; no real AWS allocation/alerts deployed. | No checkpoint-38 implementation-status change. |
| J12 | P2 | NOT_STARTED | No multi-AZ/multiregion chaos or recovery exercise. | No checkpoint-38 implementation-status change. |
| K01 | P2 | PARTIAL | PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing. | No checkpoint-38 implementation-status change. |
| K02 | P2 | NOT_STARTED | Local tag matching is not AI. Model/provider-assisted caption or metadata suggestions with human review are not implemented. | No checkpoint-38 implementation-status change. |
| K03 | P2 | PARTIAL | Live online randomized assignment, consent management and unbiased business-impact metrics remain unimplemented. | No checkpoint-38 implementation-status change. |
| K04 | P2 | PARTIAL | Language preference saved; complete translated/localized interface absent. | No checkpoint-38 implementation-status change. |
| K05 | P2 | PARTIAL | Working local short-clips listing; full vertical feed, authorized live streaming/moderation service and device tests unfinished. | No checkpoint-38 implementation-status change. |
| K06 | P2 | BLOCKED | No authorized compatible payment/ad provider or billing launch. | No checkpoint-38 implementation-status change. |
| K07 | P2 | NOT_STARTED | No verified creator earnings/payout partnership platform. | No checkpoint-38 implementation-status change. |
| K08 | P2 | NOT_STARTED | No consent/entitlement-checked encrypted offline download implementation. | No checkpoint-38 implementation-status change. |

See `PORTABLE_HANDOFF_38/01_OWNER_EXECUTION_PLAN.md` for stage gating, recommended owners and minimized Codex/Colab/laptop usage.
