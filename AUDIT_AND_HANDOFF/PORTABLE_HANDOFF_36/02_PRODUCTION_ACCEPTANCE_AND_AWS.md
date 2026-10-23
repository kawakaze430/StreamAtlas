# AWS worldwide production plan and REAL acceptance tests

**Safety/legal principle:** Worldwide accessibility is a technical objective, not authorization for unrestricted worldwide distribution. Run a **private, password-protected synthetic-content preview first**. Real adult-media operation requires independent age-assurance, participant age, consent, licenses, regional legal reviews, acceptable-use confirmation from hosting/CDN/payments, security clearance and operationally staffed moderation. No source-file toggle substitutes for these.

## Stage 0 — Establish a trustworthy local baseline (ChatGPT/agent owned)

- Verify archive SHA-256 and project inventory. Confirm clean extract, Node >=22.13, FFmpeg/ffprobe present, no private data/credentials bundled.
- Run regression tests with bounded test concurrency, static OpenAPI gaps, source-integrity validation, static policy/infra scan, media fixture tests, deterministic offline browser smoke, backup/restore on disposable data.
- Establish known failures, timeouts, red tests; never silently weaken assertions or reclassify them as passing.
- Evidence: commands, exact environment versions, pass/fail summary, logs and attachments; CI job IDs if available.

## Stage 1 — Real browser/playback acceptance (needs browser environments; split coding and external execution)

- Vendor and license-review **pinned** hls.js, verify SRI/checksum. Do not hotlink an unreviewed CDN JS dependency.
- In real-network browsers run Chromium, Firefox, Edge, WebKit/Safari macOS/iOS, Android Chrome and mobile emulation. Validate native Safari HLS vs MSE/HLS.js, caption language/size/accessibility, adaptive bitrate switching under bandwidth throttling/packet loss, error recovery and seek.
- Test start, stop, pause, resume, frame/thumbnail previews, subtitles, multiple quality renditions, signed playlist/segment access, expiry and revocation. Capture video startup, error and buffering metrics.
- Run keyboard-only and screen-reader testing; axe checks, contrast, focus states, viewport overflow, motion accessibility.
- Evidence: run artifacts by OS/browser/version/device, media network traces, 200/403 expectations, license provenance, issue log.

## Stage 2 — PostgreSQL + Spring parity (Codex/user runtime; software changes still agent-owned)

- Start disposable PostgreSQL 16+; inventory all SQL migrations actually present, execute in strict order; test from blank schema and realistic synthetic migrated data. Avoid copying real sensitive data into development.
- Validate full catalog, accounts, roles, playlists, likes/follows, watch queue/history, creator uploads/job state, moderation cases, rights holds, audit events and privacy data, not just table-name parity.
- Run concurrency/idempotency/security isolation tests and an actual backup/restore. Measure query plans and bottlenecks at representative data scale.
- Build Spring with Java 21/Maven. Current Spring module is a **starter only**; add full authenticated API with method/error/serialization parity, CSRF/session/RBAC, media entitlement, upload routes, audit and moderation semantics. Test Node vs Spring identical contract/negative cases, including deny decisions.
- Only after both APIs pass parity: private shadow traffic/controlled cutover with rollback snapshots and feature flags. Record verified rollback time, data integrity and no lost writes.
- Evidence: PostgreSQL logs, migration ledger, row-count/checksum reports, Maven CI, parity test matrix, rollback drill.

## Stage 3 — Private media worker and secure storage (authorized AWS credentials required)

- Use private S3 buckets for originals, temporary quarantine, processed segments, posters/captions and evidence; block public access, restrict IAM, encrypt with managed keys, use lifecycle and object versioning.
- Add durable upload/processing queue (SQS and DLQ or approved alternative); validate retry limits, idempotent jobs, malware scans before transcoding, archive bombs, malicious/oversized media, timeouts, FFmpeg process isolation and runaway spend.
- CloudFront OAC should prevent direct public bucket access. Signed restricted playback should check actual account age eligibility, rights/license, territory, approved publication, current holds and revocation.
- Test manifest AND every media object path (segments, keys/init objects, captions, thumbnails) for unauthenticated/expired/forged/revoked requests. Test cache invalidation/key rotation and origin bypass in real AWS staging, not with local helpers alone.
- Evidence: signed 200/401/403 matrix, private S3 IAM policies, CloudTrail, revocation times, worker/DLQ replay, malicious-input safety report.

## Stage 4 — Private AWS staging, HTTPS and release automation (user explicitly authorizes paid/cloud actions)

- User selects approved jurisdiction(s), confirms provider permitted-use terms, owns AWS account, budgets and domain. No credentials in chat/ZIP. Use IAM roles/OIDC, Secrets Manager/KMS and least privilege.
- Staging architecture: HTTPS + ACM + owned DNS, password/IP/identity gate for synthetic assets, CloudFront private static/media paths, ALB to app (only after backend selected), RDS PostgreSQL, S3, isolated workers/SQS, CloudWatch alarms, WAF/rate limits.
- Validate CI/CD builds and reversible deployments, Terraform formatting/plan/security and **explicitly approved** apply, alerts at cost/error thresholds, encryption and secret rotation, privacy logs, observability, origin isolation, CDN cache behavior.
- Test RPO/RTO via offsite encrypted DB+S3 restore in separate staging, queue replay, worker crash, AZ failure simulations, autoscaling load/soak; generate on-call and incident runbooks.
- Evidence: actual HTTPS protected URL, DNS/certificate proof, test run artifacts, billing budget proof, infrastructure inventory, restore/drill logs, SLO dashboard and error budget policy.

## Stage 5 — Independently verified lawful launch decision (NOT a coding-only task)

These gates must all be recorded as NOT DONE until evidence is obtained:

1. Qualified jurisdiction-by-jurisdiction legal opinion, permitted territories and geo restriction policy.
2. Written provider acceptability of intended lawful content, including AWS/CDN/email/registrar/payments/ads if used.
3. Contracted viewer age assurance with efficacy, fraud/bypass and accessibility evaluation; secure data/privacy assessment.
4. Independent evidence for adulthood, informed consent, distribution license and territory per performer/title, plus rights revocation processes.
5. Human moderation staffing, escalation/urgent harm handling, response timelines, notices/appeals and takedown practice.
6. Written data protection/retention/delete policies and privacy impact assessment.
7. Independent penetration test of app, infra, supply chain, payment integrations if any; remediate and retest critical/high findings.
8. Operational acceptance: load/soak, disaster recovery, key rotation, backup/restore and incident response.

**Decision gate:** default **NO PUBLIC LAUNCH** if any mandatory gate is unapproved. Internal signed receipts, mock callbacks, status badges or automated QA alone do not satisfy independent signoff.

## Minimal matrix of actual pass/fail proofs before regional release

| Test category | Example negative case | Required evidence | Current situation |
|---|---|---|---|
| Auth / accounts | Guest cannot read another user's private data; forged session and CSRF denied | Integration + browser traces | Local tests; real staging pending |
| Rights/geo/age | Unverified or out-of-territory request denied on all cache paths | Provider and CDN 403 traces | Provider and live CDN unverified |
| Streaming | Low bandwidth ABR and signed playlist/segment expiry | Multi-device network captures | Local synthetic only |
| Upload pipeline | Corrupt media, malware, crash/retry, long jobs | Isolated worker logs, DLQ and remediation | Local FFmpeg tests, cloud blocked |
| Backend migration | Schema/row parity, concurrent writes, rollback | PostgreSQL/Maven/shadow logs | Static parity only |
| API and accessibility | Every route contracted, screen reader passes | OpenAPI diff, axe and device matrix | Known contract gaps |
| Security | Privilege escalation, IDOR, SSRF, injection, webhook forgery | Independent pen test + retest | Not done |
| Reliability | DB region/AZ failure, bad rollout, object loss | Backup/DR restore & chaos reports | Local rehearsal only |
| Billing/payment (optional) | Double-charge, webhook replay, refund failure | Approved provider sandbox/live tests | Not integrated or approved |
| Content governance | Rights revocation removes all copies and caches quickly | External audit and response logs | Local holds only |

## Ownership rule

**Coding agent owns** source implementation, synthetic fixtures, tests, lint/QA, documentation and packaging. **Codex/user environment owns** what this session cannot access: Java/Maven/PostgreSQL/Docker/real browsers, AWS account/domain, actual DNS/CDN, real provider test harnesses and measured cloud results. **Independent qualified people own** legal, rights/age/consent, security audits and moderation staffing. Reassign narrowly based on actual tool availability, not entire tasks unnecessarily.
