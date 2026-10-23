# StreamAtlas handoff verification — independently executed 2026-10-22

This report records **real commands run while assembling the portable handoff**. The software source remains Checkpoint 36; only project/handoff documentation and source manifests were updated.

## Environment

- Node.js `v22.16.0`
- FFmpeg `7.1.5-0+deb13u1`; FFprobe available
- Private container, no AWS account/credentials, no external provider integrations. Synthetic sample media only.

## Commands actually run and results

| Command | Result | Scope/limitations |
|---|---|---|
| `npm run doctor` | PASS | Node/FFmpeg/FFprobe available |
| `node --test --test-concurrency=2 tests/*.test.js` | **PASS: 295 tests, 295 pass, 0 fail; duration ~33.9 s** | Local automated regression, not public staging QA |
| `npm run qa:browser:offline` | PASS | Offline Chromium synthetic MP4; 1440px desktop, 820px tablet, 390px mobile; member flows and controls |
| `npm run qa:contracts:gap` | Completed inventory | **123 static API routes, 141 reviewed OpenAPI operations, 32 uncovered static routes**. Do not call this fully covered. Inventory count is not equal to literal path/route count.
| `npm run db:pg:check` | PASS | **18** ordered PostgreSQL SQL migration files validated statically; no actual PostgreSQL server used |
| `node scripts/pg-schema-parity.js --sqlite <local disposable SQLite DB>` | PASS | 62 SQLite table names / 62 PostgreSQL DDL table names, no missing columns; static text/snapshot comparison, **not** real PostgreSQL |
| `npm run qa:security` | PASS local static security scan | NOT CVE/SCA, pentest, or cloud WAF acceptance |
| `npm run qa:infra` | PASS static policy assertions | Output explicitly says `cloudProviderVerified:false`, `deployable:false`; no terraform apply |
| `npm run qa:inventory && npm run qa:release && npm run qa:release:verify` | PASS | Deterministic local manifest / changed-source integrity after docs |

## Known incomplete or not-run verification

- **NOT RUN:** Actual PostgreSQL 16 migration/concurrency/rollback, Maven compile and Spring API parity, Docker Compose cloud-equivalent deployment.
- **NOT RUN:** Strict real-network Chromium/Firefox/WebKit and real macOS/iOS/Android ABR/device testing; native Safari HLS, physical Cast/AirPlay.
- **NOT RUN:** AWS S3/CloudFront/WAF/RDS/IAM/ACM/DNS deployment, real signed CDN segment denial and revocation, region-based traffic/soak/DR and paid cloud bills.
- **NOT RUN:** Live payment-provider sandbox/live payments (none integrated/authorized), independent age/consent/rights/legal reviews, external security penetration test and staffed moderation acceptance.
- The project is a **private synthetic-media prototype** and remains blocked from public adult-content launch.

## QA caveat

Source and release manifests must be regenerated after handoff documentation edits; the handoff archive's separate ZIP SHA-256 confirms the entire package. Clean-extraction verification must be performed on the final archive before delivery and appended to the final response.
