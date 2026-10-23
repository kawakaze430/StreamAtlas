# Checkpoint 28 — original roadmap tasks G06–G15 and J01–J05

**15/15 tasks were assessed and received local implementation, test, or concrete acceptance-preparation work. 0/15 are fully production-accepted.** Previous checkpoints remain cumulative. “Local verified” below refers only to tests run with synthetic fixtures and offline/static templates, never provider-side verification.

| Task | Added in v0.28.0 | Full acceptance blocker |
|---|---|---|
| G06 Two-path CDN/OAC | HLS `*.m3u8` cache-disabled behavior on existing private OAC/S3 distribution; static IaC guardrails | Separate static-site CDN path, actual CloudFront/ACM behavior, HTTPS and provider approval untested |
| G07 Short-lived signed HLS entitlement | Offline inspector verifies signed policy, resource path, key ID, TTL; existing signer now user-throttled | Actual CDN entitlement/hold tests and signed-cookie propagation pending |
| G08 Denial/revocation/rotation | Forgery, unsigned, expired, wrong-resource, revoked-simulation and old/new key negative tests | CloudFront origin bypass, cached credential revocation and provider invalidation unverified |
| G09 API behind ALB/ECS | Private Fargate Spring task-definition draft with secret reference/readiness | No ECS/ALB/VPC/autoscaling; Spring parity and PostgreSQL blocked |
| G10 SQS isolated workers | SQS+DLQ Terraform draft, SSE-SQS, TLS-only queue policies | Worker not integrated; no IAM boundary, job retry, or MediaConvert execution |
| G11 Territory controls | HMAC-verified edge country assertion and allowlist on private CDN cookie endpoint (optional, fail-closed) | No trusted edge injector or legal country policy; other discovery/media routes not geo-gated |
| G12 WAF and rate limits | Unattached WAF rate/common rules draft, per-user CDN signer throttle | Edge WAF not deployed/tuned; no DDoS/bot proof |
| G13 Global measurements | Aggregate 403, 5xx, cache, startup, page load and rebuffer evaluator | No approved-region or real network data; synthetic fixture under-sampled |
| G14 Cost forecasting | Operator-rate storage/egress/transcode/request calculator | No current AWS rate verification, bills, tags, or dashboards |
| G15 Multi-region DR | Fail-closed RTO/RPO decision helper | No real restore, failover, measured RTO/RPO or secondary-region justification |
| J01 Scanning/SBOM | CycloneDX package-lock SBOM and unexecuted GitHub Actions security/terraform workflow | No observed registry CVE, OS/container/IaC vulnerability scan results; no CI evidence |
| J02 Privileged MFA/email | Existing admin MFA retained; new opt-in and production verified-email check on admin APIs | No real production mail/IdP/recovery; privileged rollout and independent bypass tests pending |
| J03 Secret rotation | Offline signing key overlap tests and controlled rotation runbook | No AWS Secrets Manager/KMS/IAM rotation, MFA key migration, audit log access review |
| J04 Independent pentest | Detailed assessor scope and evidence gate | No independent assessor engaged, report, remediation or retest |
| J05 SLOs | Draft availability, API, playback, cache, jobs objectives; offline SLO evaluator | No representative telemetry, paging, 28-day observations or SLO signoff |

### Explicit limitations

- Node/SQLite remains the only verified local backend; Spring/PostgreSQL and AWS are not deployed.
- Terraform and Maven CLIs are not installed here; the new templates are **not** provider-validated. CI workflow is proposed and was not observed running.
- Geo assertions are only meaningful when a trusted gateway **removes all user-supplied geo headers and signs its own**. A raw country code is neither legal eligibility nor content rights verification.
- Already-issued CloudFront cookies and cached media can remain accessible until expiration/invalidation; the local revocation simulation is not proof of real-world revocation.
- No independent legal, age assurance, consent, content rights, jurisdiction, cloud provider, DNS, billing, penetration test or public launch approval is claimed.

**Local regression:** 19 new tests; 237/237 full suite passed before packaging. Offline Chromium desktop/tablet/mobile audit passed. Provider-side acceptance remains unverified.
