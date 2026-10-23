# Checkpoint 38 — actual execution evidence

The source v0.37.0 archive passed supplied SHA-256 `ce58dbc0ab3a2093c7a63e3ed4859a983086373f2bc455c5ffad47a12a196102`. We extracted it to a new working folder and changed only the documented files, package versions, new tests/docs, generated contracts and release manifests. Only synthetic non-explicit media was used.

## Environment actually observed

Node.js v22.16.0, npm 10.9.2, FFmpeg 7.1.5, FFprobe present, Chromium installed, JDK 21 present. **Maven, `psql`, Docker and an actual PostgreSQL server were unavailable** in this environment. No AWS credentials, deployment or legal provider acceptance.

## Executed checks

- `node --test tests/checkpoint38-chunk-store.test.js tests/upload.test.js`: PASS, 13 tests (4 pure fault tests plus 9 upload HTTP/FFmpeg tests).
- `node scripts/qa-openapi.js`: PASS, **184** reviewed OpenAPI operations.
- `npm run qa:contracts:strict`: PASS, **123** statically discovered literal operations; **0** gaps in the *literal-only scanner*. Regex routes still incomplete.
- `node --test tests/qa-contract.test.js tests/qa-route-gate37.test.js tests/checkpoint38-chunk-store.test.js`: PASS, 8 tests, after contract count update.
- `npm run doctor`: PASS (Node/FFmpeg/FFprobe).
- `npm run db:pg:check`: PASS static validation of 18 migrations, not PostgreSQL execution.
- `npm run qa:security`: PASS local static scanner, not CVE/security pentest.
- `npm run qa:infra`: PASS static assertions with `cloudProviderVerified:false`, `deployable:false`.
- `npm run qa:browser:offline`: PASS synthetic Chromium offline desktop 1440, tablet 820, mobile 390; NOT Firefox/WebKit/device acceptance.
- First `node --test --test-concurrency=2 tests/*.test.js` **was interrupted/stalled after 288 emitted test results**, with 2 expected stale-manifest failures because the release manifest had not yet been regenerated. **Do NOT treat this interrupted run as passing.**
- Subsequent isolated `node --test --test-concurrency=2 tests/upload.test.js tests/verification-challenges20.test.js tests/worker-lease09.test.js tests/worker-security45.test.js`: PASS, 16 tests.

## Final source-suite evidence

- After regenerating the manifest, `node --test --test-concurrency=1 tests/*.test.js`: **PASS 304 tests / 304 pass / 0 fail** (43.7 seconds). This is the first complete final-source suite; the previous interrupted run is not evidence of a pass.
- Full-source release inventory, deterministic manifest regeneration and `npm run qa:release:verify`: PASS against current source snapshot.
- `CHROME_PATH=/usr/bin/chromium python qa/network-e2e.py --engines chromium --strict`: **FAIL due to environment restriction**, Chromium `Page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR` at localhost. This does not establish that the application is broken or that network E2E passed; rerun on permissive hosted CI/Codex.
- Final cumulative ZIP SHA-256, fresh extraction and any fresh-extraction test evidence are recorded in the accompanying delivery verification file, not inferred from local source tests.

## Explicitly NOT RUN / NOT VERIFIED

Live PostgreSQL 16 migration/rollback/concurrency, Maven Spring compile, Docker, Terraform apply, GitHub-hosted workflows, real Chromium/Firefox/WebKit networked HLS or Safari/iOS/Android devices, CDN signed-segment revocation, private AWS staging/HTTPS/RDS/WAF/IAM, storage billing, pen test, independent age/rights/consent/legal/provider acceptance and paid services.
