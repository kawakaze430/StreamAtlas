# Detailed remaining work — after v0.19.0

The following tasks cannot be marked DONE by passing local tests or delivering
Terraform files. They require integration access, external partners, or human review.

| Major workstream | Delivered | Still required for acceptance |
|---|---|---|
| Real browser playback | Chromium decodes and plays locally generated MP4 with real controls | Fetch reviewed hls.js; Chrome/Firefox/WebKit network-HLS/ABR/slow-link tests; caption switching, Safari/iOS |
| PostgreSQL | Ordered migrations 001–005, catalog export/import, disposable Compose lab/CI | Execute against PG, parity checks, concurrent writes, identity/session migration, backup/rollback, live cutover |
| Spring Boot | Read-only starter, CI build configuration | Compile/deploy full APIs (accounts, media, rights, sessions, jobs, moderation) and contract tests; frontend switchover |
| S3/CloudFront | Private bucket/OAC/key-group IaC, signed-cookie helper, locally verified RSA signature | Terraform plan/apply with AWS identity; HTTPS custom media domain; actual entitlement middleware; unsigned/expired access tests, revocation and purge |
| Viewer age assurance | Privacy-minimized signed receipt webhooks, replay checks | Contract approved vendor, match actual schema, compliance and bypass audit, all access routes gated, regional requirements, certified vendor claims |
| Participant identity, consent and licenses | Admin evidence references, safety holds and cases | Secure verification of each participant and each media license, renewal/revocation processes, legal review, documentary security audit |
| Moderation | User complaint form, priority queues, reviewer outcomes, uploader appeals, emergency holds, case events | 24/7 triage SOP where required, legal counter-notice and repeat infringer processes, independent human reviewers, regulatory response times |
| AWS + domain | Private password-gated demo Compose, Lightsail and private-media Terraform, DNS/TLS runbooks | AWS account/permission, registered domain, billing approval, actual resources, live HTTPS, backups, cost monitors and provider permission |
| Security | CSRF, scoped sessions, MFA prototype, signed callbacks, restricted metrics, processing limits | Pen test, threat model independent assessment, malware scanner, review of dependencies and secrets, production email, KMS/IAM validation |
| Reliability | Encrypted backup & full synthetic restore drill, bounded localhost load, metrics | AWS KMS/S3 full restore rehearsal, multi-AZ recovery, realistic load/soak, dashboards/alerts/on-call, failure chaos exercises |

## Suggested safe launch sequence

1. Continue as local/private synthetic-media proof-of-concept and run CI in a
   GitHub repository you control (CI presently unexecuted in the chat container).
2. Validate Docker + PostgreSQL + Spring test services in a disposable machine.
3. Connect AWS only after permission: private preview, DNS/TLS, signed CDN, then
   restore/load and security checks using only synthetic media.
4. Separately obtain external legal/provider approval, verified content rights,
   effective viewer age assurance, participant age/consent, moderation and
   privacy/security review before any public distribution of regulated content.

**Never represent Stage 3 as authorizing Stage 4.**
