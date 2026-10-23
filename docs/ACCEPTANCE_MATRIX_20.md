# Production acceptance matrix (v0.20.0)

**Important:** This is a conditional checklist, not a certification. None of the rows labeled EXTERNAL is satisfied by local tests. Public regulated-media launch remains blocked.

| Workstream | Software delivered / locally exercised | Unmet acceptance evidence and responsible party |
|---|---|---|
| Browser & HLS | Responsive Chromium injection audit at desktop/tablet/mobile; real synthetic MP4 decode, time progression & speed changes; native MP4 fallback; optional pinned hls.js vendor script | EXTERNAL: reviewed hls.js bundle, Chrome/Firefox/WebKit/Safari/iOS **network** HLS playback, real ABR switching/captions under slow networks, user-device E2E (frontend QA) |
| PostgreSQL | Eight SQL migration files, catalog-only checksum export/import generator, disposable PG16 Compose and CI scripts | EXTERNAL: execute migrations on PostgreSQL; import and verify every catalog & identity/session/rights row; concurrent write isolation; encrypted backups and tested rollback; live routing cutover (database engineers) |
| Spring Boot | Read-only catalog starter + CI build and contract | EXTERNAL: complete accounts, sessions, publisher rights, media, jobs, moderation, audit APIs; independently run Maven build and both stacks' contracts; frontend cutover (backend engineers) |
| S3 / CloudFront | Terraform OAC private bucket/key group; signer RSA verification; receipt/rights-controlled synthetic cookie-issuing API; outbox for invalidation request | EXTERNAL: AWS Terraform plan/apply approved by account owner, custom media DNS and ACM TLS, unsigned and expired-cookie 403 tests, secure S3 permissions, emergency key rotation/removal/invalidations and logs (cloud security) |
| Viewer age assurance | Opaque receipt, signed webhook timestamp/replay checks, one-time challenge binding, private receipt gate | EXTERNAL: jurisdiction-by-jurisdiction counsel and appropriate vendor contract, audited actual provider payload, effectiveness/fairness/bypass assessments, all-path UX gating, privacy impact assessment (provider/legal/QA) |
| Participant consent / content rights | References and human review acknowledgment, dated license review, renewal/revocation, safety holds and quarantine | EXTERNAL: evidence authenticity, every participant's adulthood and consent, license territory/expiry, revocation and retention workflows, independent audit; no true documents stored in demo (rights/legal review) |
| Moderation | Complaint categories, priorities, decisions, uploader appeal trail, emergency holds, revocation queue | EXTERNAL: staffed triage coverage, emergency response, copyright counter-notice and repeat-infringer policy, regulator SLA, escalation and independent reviewers (operations/counsel) |
| AWS / domain | Password-gated single-VM Docker/Caddy/Terraform sample, private media IaC, operator deployment smoke | EXTERNAL: own/buy domain, approve AWS bill/credits/provider policy, IAM MFA, real static IP/HTTPS/DNS, S3/CDN provisioning, backups and billing alerts (account owner) |
| Security | CSRF, session protection, authenticator MFA prototype, owner-only signer, antivirus hook, isolated worker example, metrics protection and tests | EXTERNAL: dependency review, secrets rotation/KMS, executable AV provisioning, independent penetration test, signed trust boundaries, IAM review, real email provider (security) |
| Reliability | Encrypted synthetic backup & local full restore, bounded localhost load, dashboard metrics, Prometheus alert examples | EXTERNAL: S3/KMS cross-account recovery, multi-AZ, failover, real load/soak and chaos exercises, paging/SLO/on-call ownership (SRE) |

## Operator-approved order of execution

1. Create a private synthetic-media staging environment and prove the browser, Docker, full API and failure-recovery flows with no public regulated content.
2. Fully validate PostgreSQL and Spring Boot cutover on disposable data; if migrating real data, use controlled, audited encryption and retention procedures.
3. Connect domain, ACM TLS, private S3 and CloudFront only after obtaining the relevant account permission and confirming provider acceptance.
4. Connect actual age/rights providers and gather independent legal and security approval before considering broader launch.
5. Perform cloud recovery, load, monitoring, on-call and final go/no-go assessment. A green CI test suite is not sufficient.

No secret values, personal identification documents, or real participant data belong in this repository or ZIP.
