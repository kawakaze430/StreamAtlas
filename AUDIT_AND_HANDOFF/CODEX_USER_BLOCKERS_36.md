# Checkpoint 36 — Strictly External Codex/User Handoff

**Do not spend limited Codex time on tasks still feasible for ChatGPT's local code/testing workspace.** Code changes remain ChatGPT-owned. The user, Codex or qualified external reviewers should perform only items requiring actual tools, subscriptions, provider access, hardware devices, or legal authority. No provider resources were changed here.

## Prioritized external execution checklist

1. On a *disposable, private* environment: install/use PostgreSQL 16, execute all migration scripts in order; run tests and schema/data parity, then Maven/Spring Boot compilation and parity.
2. Install/review pinned `hls.js`, run real-network Chromium/Firefox/WebKit plus mobile Safari/Android ABR and captions tests; do not distribute proprietary content.
3. With explicit AWS authorization, validate IAM/budgets, private S3/OAC/CloudFront signed media, key rotation and fast revocation, and an HTTPS password-protected synthetic staging site. Public-content launch stays disabled.
4. If user-authorized later, perform backup/restore, load/chaos, WAF/rate-limit and disaster-recovery exercises on isolated cloud services.
5. Separately arrange required provider acceptance, age assurance, consent/rights verification, content-moderation staffing, legal reviews and independent security assessments. None can be substituted by code or Codex.

## Externally assigned 117-task entries

- **B01** [NOT_STARTED]: Vendor a reviewed, pinned hls.js version locally with integrity and license verification. — Pinned reviewed hls.js binary not vendored and audited locally.
- **B05** [NOT_STARTED]: Test automatic ABR changes under throttled bandwidth and packet loss. — No observed genuine ABR throttling/packet-loss acceptance.
- **B08** [BLOCKED]: Real-playback tests with signed manifests, initialization files, segments and captions after revocation. — Requires live signed HLS manifest/segment/caption revocation testing.
- **B09** [BLOCKED]: Cross-browser/device tests: Chrome, Firefox, Edge, Safari macOS and iOS, Android Chrome. — Offline Chromium only; Firefox, Edge, Safari/iOS and Android device matrix untested.
- **B16** [NOT_STARTED]: Optional Cast/AirPlay and appropriately licensed offline downloads. — No verified Cast/AirPlay or licensed offline download subsystem.
- **D09** [NOT_STARTED]: Migrate search to OpenSearch only after measuring database-search limits. — Only tiny SQLite benchmarks; no evidence-based OpenSearch migration or deployment.
- **E04** [BLOCKED]: Require validated rights, adult participant evidence, consent and territory before publish. — Review references and declarations are not independently verified age/consent/licensing evidence.
- **F01** [PREPARED]: Start PostgreSQL 16+ in a disposable environment and apply ordered migrations in CI. — Ordered PostgreSQL 16 runner/CI and 13 migrations; no observed real PostgreSQL execution.
- **F05** [PREPARED]: Test concurrent writes, consistency, idempotency, isolation and realistic query performance. — Concurrency test defined for disposable PostgreSQL; not executed here.
- **F08** [NOT_STARTED]: Perform controlled dual-read/shadow mode or maintenance-window cutover with checkpointed rollback. — No actual shadow reads, live cutover or rollback exercise.
- **F09** [BLOCKED]: Deploy managed database with PITR, encryption, backup policies and restore exercises. — No managed RDS/PITR or provider-side encrypted restore drill.
- **G01** [BLOCKED]: Obtain domain registration/renewal details, provider acceptance, AWS account access and billing approval. — No verified owned domain, AWS account authorization or billing/provider approval.
- **G02** [BLOCKED]: Configure least-privilege IAM, deployment roles/OIDC, secrets manager, KMS and budgets/alerts. — Least-privilege/IAM/KMS/budget design only; no real resources deployed.
- **G03** [BLOCKED]: Deploy password-gated synthetic-media staging with protected access and HTTPS. — Password-gated private staging Compose prepared; not deployed/tested on public HTTPS.
- **G04** [BLOCKED]: Configure Route 53 or external registrar DNS, ACM certificates, www/app/media hostnames and redirects. — DNS/ACM runbooks, no owned DNS records or valid custom media certificate.
- **G05** [PREPARED]: Provision private S3 original-media and transcoded-media buckets with lifecycle, encryption and no public ACL. — Private S3 originals/renditions Terraform drafts; no terraform plan/apply or S3 checks.
- **G06** [PREPARED]: Deploy two-path CDN/cache rules: static website assets and protected HLS media; use OAC for S3. — CloudFront OAC and uncached manifest template; no provider deployment.
- **G08** [PARTIAL]: Test unsigned/expired/revoked access and source-bucket bypass; rotate keys and invalidate cached assets. — Offline expired/forged/revoked simulation; no cached key rotation/purge proof on AWS.
- **G09** [PREPARED]: Deploy Spring API behind ALB on ECS/Fargate or appropriately sized VM with health/readiness and autoscaling. — Spring ECS task-definition draft; no service/ALB/autoscaling running.
- **G10** [PREPARED]: Deploy SQS + isolated processing or approved MediaConvert workflow; private event processing. — SQS/DLQ draft; not integrated with media worker/provider.
- **G12** [PREPARED]: Add WAF, rate limits, DDoS and bot protections at edge, origin and API layers. — Unattached WAF draft and local throttling; not deployed/tuned against attacks.
- **G13** [PREPARED]: Measure global page load, startup/buffering, 403s and CDN cache hit rate from approved regions. — Synthetic aggregate dashboard/evaluator; no global-region CDN telemetry.
- **H01** [BLOCKED]: Obtain written legal guidance for where the service can operate and where content can be viewed. — Requires written independent jurisdiction-specific legal opinion.
- **H02** [BLOCKED]: Confirm acceptable use with AWS, registrar, CDN, email and payment vendors for intended lawful content. — Requires written terms/provider acceptance for intended use.
- **H03** [BLOCKED]: Contract a suitable viewer age-assurance provider and validate live signed API/webhook schemas. — Signed callbacks are local stubs; no contracted age-assurance provider/live schema.
- **H06** [BLOCKED]: Independently verify participant adulthood, informed consent, permitted uses and license provenance. — Independent adulthood, consent and license documentary verification has not occurred.
- **H09** [BLOCKED]: Complete privacy impact assessment, deletion/retention policies, regulator and legal requirements. — No completed privacy impact assessment or jurisdiction-specific retention legal signoff.
- **H10** [BLOCKED]: Run age-assurance effectiveness and bypass testing, provider and independent legal signoff. — No independent age-assurance effectiveness/bypass assessment or legal approval.
- **I06** [BLOCKED]: Train and staff appropriate human moderation, escalation and emergency response. — Human moderator staffing, training, emergency/24-7 coverage unverified.
- **I07** [BLOCKED]: Review response times and notices with jurisdiction-specific counsel. — Jurisdiction-specific deadline/SLA legal review has not occurred.
- **J04** [BLOCKED]: Run independent penetration test, remediate critical/high findings and retest. — Independent penetration assessment/remediation/retest not performed.
- **J07** [BLOCKED]: Perform encrypted DB + S3/KMS complete restore to disposable cloud environment, verify media parity. — Synthetic encrypted restore drill passed; required S3/KMS cloud restore not done.
- **J12** [NOT_STARTED]: Perform multi-AZ chaos testing and multi-region recovery if justified by traffic and business requirements. — No multi-AZ/multiregion chaos or recovery exercise.
- **K01** [PARTIAL]: Cast/AirPlay and installable PWA (subject to device/platform policy). — PWA manifest and local PiP; actual Cast/AirPlay/install acceptance missing.
- **K06** [BLOCKED]: Subscription billing and ad operations only with compatible permitted providers. — No authorized compatible payment/ad provider or billing launch.
