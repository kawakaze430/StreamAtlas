# StreamAtlas v0.39.0 — 117-task roadmap and evidence handoff

**Private synthetic-media prototype, not a public production release.** All statuses carried forward except new evidence on A06/A07; neither is considered complete.

| State | Count |
|---|---:|
| LOCAL | 26 |
| PARTIAL | 51 |
| PREPARED | 10 |
| BLOCKED | 19 |
| NOT_STARTED | 11 |
| **Total** | **117** |

## Checkpoint 39 changes

- **A06 remains PARTIAL:** 60 source-level regex API matcher candidates inventoried, strict guard detects any added/modified patterns. These may include guards, not necessarily endpoints; no new API response schemas claimed.
- **A07 remains PARTIAL:** hosted QA workflow gains matcher guard and executable version diagnostics. No GitHub-hosted acceptance evidence confirmed.
- Codex run at commit `a1b73300336573b7fccd936669b830a6157a63ed` executed zero Postgres/Maven/real-browser suites due absent PostgreSQL server and client, Maven and Playwright browser executables. No application failure established.

## All 117 tasks

| Task | Priority | Status | Remaining acceptance | Checkpoint 39 work |
|---|---|---|---|---|
| A01 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| A02 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| A03 | P0 | PARTIAL | Playwright multi-engine runner configured; Chromium network navigation blocked, Firefox/WebKit not executed. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| A04 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| A05 | P0 | PARTIAL | Caption-size/contrast browser selector and enhanced offline DOM checks passed. Full axe, Safari, screen reader still outstanding. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| A06 | P0 | PARTIAL | Other dynamic regex routes, all route-specific schema parity, full negative access tests, actual hosted CI pending. 11 upload dynamic operations now reviewed; literal static scanner is not complete discovery. | Added strict source-level inventory of 60 existing dynamic regex API matcher patterns. Future changed/unreviewed regex patterns fail the dynamic audit; endpoint method/schema parity remains partial. |
| A07 | P0 | PARTIAL | Real hosted CI browser/device/PostgreSQL/SCA gates, successful runs and audit review required. | Strengthened hosted CI dynamic-route guard and Java/Maven/PostgreSQL version diagnostics; external Codex evidence found missing installed runtimes, no executed app failures. |
| A08 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B01 | P0 | NOT_STARTED | Pinned reviewed hls.js binary not vendored and audited locally. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B02 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B03 | P0 | PARTIAL | Player HLS adapter/native fallback exists; cross-browser adaptive playback not validated. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B04 | P0 | PARTIAL | Full browser ABR, higher-resolution media, cost/performance quotas and cross-device testing pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B05 | P0 | NOT_STARTED | No observed genuine ABR throttling/packet-loss acceptance. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B06 | P0 | PARTIAL | Manual MP4 qualities exist; real HLS Auto/variant preservation not proven. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B07 | P0 | PARTIAL | Player retry and MP4 fallback code exists; real CDN/network failures not tested. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B08 | P0 | BLOCKED | Requires live signed HLS manifest/segment/caption revocation testing. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B09 | P0 | BLOCKED | Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B10 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B11 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B12 | P1 | PARTIAL | Size/contrast cue CSS and persisted local selector, tested in Chromium offline harness; iOS/Safari caption behavior not validated. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B13 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B14 | P1 | PARTIAL | Touch seeking exists; real mobile orientation/fullscreen acceptance missing. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B15 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| B16 | P2 | NOT_STARTED | No verified Cast/AirPlay or licensed offline download subsystem. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C01 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C02 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C03 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C04 | P1 | PARTIAL | Account preferences and watch position verified across two independent authenticated sessions, with other-account isolation; actual physical devices still pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C05 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C06 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C07 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C08 | P1 | LOCAL | Local candidate ranking, safety filtering, deduplication and diversity implemented and verified. Large-scale outcomes, advanced embedding experiments and consented A/B tests remain separately tracked under D10/K03. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C09 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| C10 | P2 | LOCAL | Actual mobile install/privacy behavior and production sync remain external acceptance; local engineering criterion met. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D01 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D02 | P1 | PARTIAL | Responsive UI tested offline; exact parity against both supplied recordings not finally signed off. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D03 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D04 | P1 | PARTIAL | Large-catalog search indexing/benchmark and complete metadata taxonomy governance remain pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D05 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D06 | P1 | PARTIAL | Canonical SEO/sitemap policy and safe rights-aware merge workflow remain incomplete; candidates are advisory only. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D07 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D08 | P1 | PARTIAL | Private follows for performer/site/network; actual source permissions and global feed unfinished. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D09 | P1 | NOT_STARTED | Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| D10 | P2 | PARTIAL | No trained embeddings, live consented A/B experiments or real-user outcomes. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E01 | P0 | PARTIAL | Multi-host lock or S3 multipart durable uploads, secure object quotas and cloud integrity/restart failure tests pending. Single-writer SQLite crash replay locally hardened. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E02 | P0 | PARTIAL | ClamAV fail-closed hook and FFmpeg limits; production isolation/scanning unverified. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E03 | P0 | PARTIAL | Distributed broker, full worker process chaos tests, supervised rollout and remote observability still pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E04 | P0 | BLOCKED | Review references and declarations are not independently verified age/consent/licensing evidence. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E05 | P0 | PARTIAL | Actual CDN purges and end-to-end revocation test pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E06 | P1 | PARTIAL | Bulk actual transfer browser e2e, scheduling automation, production publish/review workflow and cloud direct uploads remain incomplete. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E07 | P1 | LOCAL | Large-scale media and live CDN caching require external acceptance; local feature criterion met. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E08 | P1 | PARTIAL | Qualified watch time, detailed audience analytics and real-source reporting remain pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E09 | P1 | PARTIAL | Full channel team management, delegated upload flow and independent permission audit pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| E10 | P1 | PARTIAL | Authentic licensing evidence, renewal and staff re-review pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F01 | P0 | PREPARED | Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F02 | P0 | PARTIAL | Added SQLite views/duration keyset indexes and PostgreSQL migration 015 draft; PostgreSQL execution, rollback and full constraint audits remain external. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F03 | P0 | PARTIAL | Signed catalog export and preflight parity; no actual PostgreSQL import/row-level compare. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F04 | P0 | PARTIAL | Encrypted SQLite private snapshot export; real identity/MFA/session import unfinished. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F05 | P0 | PREPARED | Concurrency test defined for disposable PostgreSQL; not executed here. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F06 | P0 | PARTIAL | Read-only Spring catalog starter only; full authenticated API suite absent. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F07 | P0 | NOT_STARTED | Static route comparison showed 0 matching routes; behavioral parity not established. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F08 | P0 | NOT_STARTED | No actual shadow reads, live cutover or rollback exercise. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F09 | P0 | BLOCKED | No managed RDS/PITR or provider-side encrypted restore drill. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| F10 | P1 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G01 | P0 | BLOCKED | No verified owned domain, AWS account authorization or billing/provider approval. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G02 | P0 | BLOCKED | Least-privilege/IAM/KMS/budget design only; no real resources deployed. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G03 | P0 | BLOCKED | Password-gated private staging Compose prepared; not deployed/tested on public HTTPS. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G04 | P0 | BLOCKED | DNS/ACM runbooks, no owned DNS records or valid custom media certificate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G05 | P0 | PREPARED | Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G06 | P0 | PREPARED | CloudFront OAC and uncached manifest template; no provider deployment. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G07 | P0 | PARTIAL | Local signed-cookie entitlement and offline signature inspection; no CloudFront validation. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G08 | P0 | PARTIAL | Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G09 | P0 | PREPARED | Spring ECS task-definition draft; no service/ALB/autoscaling running. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G10 | P0 | PREPARED | SQS/DLQ draft; not integrated with media worker/provider. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G11 | P0 | PARTIAL | Optional HMAC edge country assertion; not all entry points/territory legal rules gated. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G12 | P0 | PREPARED | Unattached WAF draft and local throttling; not deployed/tuned against attacks. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G13 | P0 | PREPARED | Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G14 | P1 | PREPARED | Cost calculator uses placeholder inputs; no actual AWS bills/rates allocation. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| G15 | P2 | NOT_STARTED | Multi-region DR decision helper only; no second-region exercises. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H01 | P0, EXTERNAL | BLOCKED | Requires written independent jurisdiction-specific legal opinion. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H02 | P0, EXTERNAL | BLOCKED | Requires written terms/provider acceptance for intended use. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H03 | P0, EXTERNAL | BLOCKED | Signed callbacks are local stubs; no contracted age-assurance provider/live schema. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H04 | P0 | PARTIAL | Complete runtime route inventory and independent age/territory bypass audit remain pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H05 | P0 | PARTIAL | Account-bound expiring/revocable local receipts; live vendor/session enforcement unverified. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H06 | P0, EXTERNAL | BLOCKED | Independent adulthood, consent and license documentary verification has not occurred. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H07 | P0 | PARTIAL | Encrypted documentary vault, legal holds, access logging and independent audit still pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H08 | P0 | PARTIAL | Full jurisdiction/time access enforcement and revocation on remote CDNs pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H09 | P0, EXTERNAL | BLOCKED | No completed privacy impact assessment or jurisdiction-specific retention legal signoff. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| H10 | P0, EXTERNAL | BLOCKED | No independent age-assurance effectiveness/bypass assessment or legal approval. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| I01 | P0 | PARTIAL | Human intake SOP, legal standing and regulator procedures remain pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| I02 | P0 | PARTIAL | True staffed SLA and immutable evidence custody acceptance remain pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| I03 | P0 | PARTIAL | Actual distributed takedown and cache-purge test pending. Checkpoint 36 improves local scope; full original external/operational acceptance remains pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| I04 | P0 | PARTIAL | Appeals and decisions exist; legally reviewed counter-notice/repeat-infringer procedure missing. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| I05 | P0 | PARTIAL | Independent sensitive-case reviewer and documentary access checks pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| I06 | P0, EXTERNAL | BLOCKED | Human moderator staffing, training, emergency/24-7 coverage unverified. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| I07 | P0, EXTERNAL | BLOCKED | Jurisdiction-specific deadline/SLA legal review has not occurred. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| I08 | P1 | LOCAL | Locally implemented with human decision; operating staffing and production abuse-model evaluation remain separate gates. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J01 | P0 | PARTIAL | Basic SBOM/source scans and unrun CI definitions; full container/IaC/CVE scanner unverified. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J02 | P0 | PARTIAL | Admin MFA/verified-email controls local; production mail/IdP and recovery audit absent. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J03 | P0 | PARTIAL | Local signer rotation and runbooks; real IAM/KMS/secret rotation not tested. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J04 | P0 | BLOCKED | Independent penetration assessment/remediation/retest not performed. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J05 | P0 | LOCAL | Local implementation complete; external production acceptance is separate. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J06 | P0 | PARTIAL | Production alerting, tracing and staffed on-call remain pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J07 | P0 | BLOCKED | Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J08 | P0 | PARTIAL | Real distributed soak, worker failure and rate stress tests pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J09 | P0 | PARTIAL | Real AWS KMS/S3 restore, rollback and DNS/failover exercise pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J10 | P0 | PARTIAL | Independent legal, security, provider and operational signoff remain pending. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J11 | P1 | PREPARED | Cost estimates/static calculators only; no real AWS allocation/alerts deployed. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| J12 | P2 | NOT_STARTED | No multi-AZ/multiregion chaos or recovery exercise. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| K01 | P2 | PARTIAL | PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| K02 | P2 | NOT_STARTED | Local tag matching is not AI. Model/provider-assisted caption or metadata suggestions with human review are not implemented. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| K03 | P2 | PARTIAL | Live online randomized assignment, consent management and unbiased business-impact metrics remain unimplemented. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| K04 | P2 | PARTIAL | Language preference saved; complete translated/localized interface absent. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| K05 | P2 | PARTIAL | Working local short-clips listing; full vertical feed, authorized live streaming/moderation service and device tests unfinished. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| K06 | P2 | BLOCKED | No authorized compatible payment/ad provider or billing launch. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| K07 | P2 | NOT_STARTED | No verified creator earnings/payout partnership platform. | Retained Checkpoint 38 state; no additional local acceptance completed. |
| K08 | P2 | NOT_STARTED | No consent/entitlement-checked encrypted offline download implementation. | Retained Checkpoint 38 state; no additional local acceptance completed. |
