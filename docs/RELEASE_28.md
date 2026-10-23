# StreamAtlas v0.28.0 — private edge and security readiness

This release extends Checkpoint 27 without replacing the verified Node/SQLite prototype. It assesses **15 original roadmap tasks G06–G15 and J01–J05**, implements local security improvements and draft infrastructure, and records precise external blockers. No task is represented as production-complete.

## New runnable code and local acceptance work

- `src/cloudfront-access.js`: offline signed-cookie policy inspector rejects bad signatures, unknown keys, wrong upload/resource, expiry, overlong TTL and locally simulated revoked assets. Existing signer remains scoped to one uploaded video; inspection does not act as CloudFront.
- `src/territory-policy.js`: HMAC-authenticated, timestamped, request-path-bound edge assertion and explicit allowlist. The private CDN cookie API optionally enforces it under `SA_ENFORCE_TERRITORY=1`, with a **trusted stripping/injection proxy prerequisite**; otherwise the prototype behavior remains unchanged.
- `src/server.js`: 12-per-minute per-user cookie-signing rate limit; production or opt-in verified-email requirement for admin API access, in addition to existing MFA. `/api/health` and `/api/ready` identify v0.28.0.
- `deployment/aws/media-cdn/main.tf`: uncached HLS manifests with signed-key-group enforcement; existing private OAC/S3 design retained. New unapplied SQS+DLQ, WAF and Spring ECS task-definition drafts in `deployment/aws/`.
- `scripts/edge-readiness.js`, `scripts/slo-evaluate.js`, `scripts/cdn-cost-forecast.js`, `scripts/dr-decision.js`: strict aggregate validators and operator-input calculators, with explicit no-provider-evidence flags.
- `scripts/generate-sbom.js` and `qa/sbom.cdx.json`: CycloneDX 1.5 metadata-only application and lockfile inventory. The lockfile currently has no third-party npm packages; this is not an OS, container, native dependency or vulnerability scan.
- `scripts/infra-policy-audit.js`: static guardrails for the draft CloudFront/S3/SQS/WAF/ECS configuration, including a negative mutation test. `scripts/check-release-gates.js`: intentionally fails closed for production acceptance.
- `.github/workflows/security-checkpoint28.yml`: proposed CI for source scan, registry npm audit, SBOM and Terraform validation. This workflow was **not run or verified** here.

## Commands

```bash
npm run doctor
npm test
npm run qa:infra
npm run qa:security
npm run qa:sbom
npm run qa:release:verify
node scripts/edge-readiness.js deployment/monitoring/edge-aggregate.synthetic.json
node scripts/cdn-cost-forecast.js deployment/aws/cost-input.example.json
node scripts/check-release-gates.js docs/RELEASE_GATE_EVIDENCE_28.json --report-only
```

The example cost rates are zero placeholders, **not an AWS free-tier quote**. The example edge sample is synthetic and intentionally below the required playback sample threshold. Read `docs/STATUS_28.md` for every task and the exact remaining acceptance requirements.

## Verified in this run

- **237/237 Node regression tests passed**, including **19 new Checkpoint 28 tests**; the initial baseline was 218/218.
- `npm run doctor` passed with Node 22.16.0, FFmpeg/FFprobe 7.1.5.
- `npm run qa:infra` passed 13 **static** guardrails, `npm run qa:security` passed the source/package scan, and release integrity checks passed after manifest regeneration.
- Offline Chromium browser audit passed desktop 1440px, tablet 820px, and mobile 390px, including synthetic video playback. This is **not** live HLS/CloudFront, Firefox/WebKit or public launch testing.
- Upgraded a disposable SQLite database initialized from v0.27.0 with v0.28.0 code; 72 synthetic videos and all 56 application tables were retained, `PRAGMA integrity_check=ok`.
- PostgreSQL 13-migration manifest validated **statically**. `psql`, Maven, Terraform, AWS, and real provider-side testing were not available/executed.
- A fresh extraction of the cumulative ZIP is independently retested before delivery.
