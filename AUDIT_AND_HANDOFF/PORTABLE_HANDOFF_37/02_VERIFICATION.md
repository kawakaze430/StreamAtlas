# Checkpoint 37 execution evidence — 2026-10-23

These are commands **actually executed locally** while preparing the handoff. They are not simulated cloud, external-provider, device-farm or legal acceptances. Prior v0.36.0 report contains the 295/295 historical baseline; new Checkpoint 37 regression added four test cases.

## Uploaded baseline verification

- Uploaded archive: `streamatlas-complete-through-36-PORTABLE-HANDOFF(1).zip` (2,578,992 bytes, 444 ZIP entries).
- SHA-256: `2adc16367e8b78474603ad5f81f7d2810b9bb4808653813494a300e1409043d6` equals supplied hash text; ZIP CRC `testzip()` returned no errors; no absolute/parent traversal paths found.

## Environment

- Node.js `v22.16.0`; FFmpeg/FFprobe available; Chromium binary at `/usr/bin/chromium`.
- Isolated ephemeral SQLite QA fixtures, synthetic videos. No AWS credentials, real media, signed provider transaction or real PostgreSQL/Maven runtime used.

## Executed validation

| Command | Observed result | Limitations |
|---|---|---|
| `npm run doctor` | PASS Node/FFmpeg/FFprobe | Tool existence only |
| `node --test --test-concurrency=2 tests/*.test.js` | **299/299 PASS**, 0 failed, ~12.9 s | Local Node/SQLite; synthetic fixtures, no remote staging |
| `npm run qa:contracts:strict` | PASS, **123 static operations**, 173 OpenAPI operations, **0 uncovered literal operations** | Does not enumerate all regex/dynamic URL handlers |
| `node --test --test-concurrency=2 tests/qa-contract.test.js tests/qa-contract37.test.js tests/qa-route-gate37.test.js` | PASS, **6/6** | Isolated sampled behavioral negative cases, not complete protocol parity |
| `npm run qa:browser:offline` | PASS: bundled MP4 and desktop/tablet/mobile widths 1440/820/390 | Offline Chromium only; no real Safari, Firefox, iOS, Android, CDN ABR |
| `npm run qa:security` | PASS static source policy scan | Not an external penetration test, SCA or CVE audit |
| `npm run qa:infra` | PASS static guardrails, **`cloudProviderVerified:false`, `deployable:false`** | No AWS deployment, plan/apply or policy provider verification |
| `npm run db:pg:check` | PASS for 18 migrations (static) | No PostgreSQL 16 server/migration/rollback execution |
| `npm run qa:sbom` | Generated metadata SBOM (0 locked external npm packages) | Not external dependency vulnerability analysis |
| `npm run qa:openapi` | Generated 173 OpenAPI operations | Some schemas are still generic; external spec audit pending |
| `npm run qa:inventory && npm run qa:release && npm run qa:release:verify` | PASS after source/document changes | Source manifest attestation, not code signing or production readiness |

## Not executed / not approved

- PostgreSQL 16 live migration, concurrency, rollback/recovery, Spring Boot Maven compile/integration, container Compose staging.
- Networked Chromium/Firefox/WebKit, real iOS/Safari/Android HLS adaptive switching, playback under CDN token expiry and region restrictions.
- Private AWS WAF/S3/CloudFront/RDS/ECS/IAM/ACM/DNS and actual signed segment revocation, domain, cloud costs, load/soak/DR.
- Independent security pentest, age/identity vendor/provider contracts, participant age/consent/license/legal review, operational moderator staffing and public adult-content eligibility.

## Accurate scope

A06/A07 remain `PARTIAL`; task counts unchanged: LOCAL 26, PARTIAL 51, PREPARED 10, BLOCKED 19, NOT_STARTED 11. No public launch can be approved by this document. Final-archive verification, file count and digest are provided by the adjacent downloadable `.zip.sha256` file; the final user response additionally reports clean-extraction tests. This markdown document contains no embedded archive hash to avoid self-referential attestation.
