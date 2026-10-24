# StreamAtlas v0.46.0 — implementation and external-runtime evidence

Date: 24 October 2026 (Asia/Calcutta). Private synthetic-media checkpoint;
public launch and production cutover remain unapproved.

## Exact source and synchronization

- Authoritative v0.45 baseline fetched and preserved: `59198fe61a2f6083794d47954c034e9f0474e3be`.
- Implementation/tested application commit **S1**: `3bc73259bd166ae4fa122909055327a9c939f91c`.
- Final verified source commit **S2**: `6bd87bf4e3a4fca2368d34beca26d3a3e754d12e`.
- S2 changes only `tests/shadow-read46.test.js` and four integrity manifests from S1. Application, Java, CI, dependency and infrastructure bytes are identical. Results reused below explicitly identify S1.
- The publication commit following S2 updates this evidence file only. Its SHA is available from `git rev-parse HEAD` and the delivery message; no self-referential SHA is invented.
- Worked on existing `main` only. No branch, worktree, PR, fork, tag, forced update or deployment was created. No baseline tracked file was deleted. Historical checkpoints remain intact.
- Original v0.39 ZIP was never available: direct archive comparison is **NOT RUN**. The owner supplied v0.45 as the authoritative continuation baseline. No missing-archive comparison is claimed.
- Untracked pre-existing `CODEX_EXTERNAL_TEST_EVIDENCE.md` was preserved and excluded from commits and ZIP selection.

## Implemented checkpoint

Authenticated PostgreSQL-backed Spring identity/preferences GETs; actual synthetic
Node/Spring shadow comparison; fenced private worker attempts, cancellation and
bounded crash recovery; verified self-hosted hls.js 1.7.3 and notices; stricter
reviewed dynamic contracts and typed requests; offline multipart plan/receipt
validation; vendored SBOM/advisory audit; safe cumulative ZIP packaging; required
CI gates with separate integration counts and sanitized parity proof.

All 117 tracker IDs/history are retained: **28 LOCAL / 60 PARTIAL / 10 PREPARED /
19 BLOCKED**. Only B01 advances to LOCAL for local vendoring acceptance. Original
62 partial acceptance entries remain listed, with external approval false.

## Environment

| Runtime | Actual version |
|---|---|
| Node / npm | 22.16.0 / 11.9.0 |
| Python / Playwright package | 3.12.14 / 1.56.0 |
| Complete JDK used for Maven | Eclipse Temurin 21.0.9+10 |
| Maven / Spring Boot | 3.9.11 / 3.5.6 |
| PostgreSQL | 16.15, disposable Docker `postgres:16` |
| FFmpeg / FFprobe | 7.1.5-0+deb13u1 |
| Terraform | 1.12.2 |
| AWS Terraform providers | 5.100.0 (media-cdn/edge-waf), 6.70.0 (queue) |
| Docker engine/client / Compose | 28.4.0 / 2.40.3 |
| actionlint | 1.7.7 |
| Vendored HLS | hls.js 1.7.3, SHA256 `a12e7ee1cd64a69dcdb314157e45dafcba705bfb0b1440b7935cb265d374423e` |

Node commands used `PATH=/tmp/streamatlas-ownership-20261024/node22/bin:$PATH`.
Maven used `JAVA_HOME=/tmp/streamatlas-ownership-20261024/jdk-21` and
`/tmp/streamatlas-ownership-20261024/apache-maven-3.9.11/bin/mvn`.
Its final full command was:

```sh
mvn -o -f backend-spring/pom.xml -B -ntp -Dmaven.repo.local=/tmp/streamatlas-ownership-20261024/m2 test
```

Real integration enabled `SA_TEST_PG=1`,
`SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS`,
`SA_TEST_PG_URL=jdbc:postgresql://127.0.0.1:46456/sa_disposable_spring46`,
`SA_TEST_PG_USER=sa_test` and empty synthetic trust-auth password. No shared or
production database was accessed. Own disposable container `streamatlas-qa-pg46`
was published only at `127.0.0.1:46456`; the protected CLI used a transient psql
wrapper fixed to that container/role/database. PG service/host override variables
were unset. Wrapper and database are not deliverable source.

## Executed checks

Every PASS below returned exit **0**. NOT RUN is not a passing assertion.

| Check and command | Source | Exit | Result / measured scope |
|---|---|---:|---|
| `node --test --test-concurrency=2 tests/*.test.js` | S1 checkout; S2 fresh ZIP | 0 | **PASS 431/431**, no skips; full regression including real synthetic FFmpeg, private media, negative authorization, worker/process failure, vendor and contract tests |
| `python -m unittest discover -s qa/tests -p 'test_*.py' -v` (fresh run omits `-v`) | S1; S2 fresh ZIP | 0 | **PASS 46/46**, includes packaging and false-green evidence rejection |
| Maven full command above, opt-in PG enabled | S1, unchanged Java at S2 | 0 | **PASS 31/31**, 24 unit + 7 real PostgreSQL integration, 0 failures/errors/skips |
| `mvn -f backend-spring/pom.xml -B -ntp -Dtest=SessionAccountPostgresTest -DfailIfNoTests=true package` (local cache flag additionally used) | same Java bytes | 0 | **PASS 7/7**, executable jar built; actual DB fixtures cleaned |
| `node scripts/pg-migrations.js --apply` | unchanged migration/runner bytes at S1/S2 | 0 | **PASS**, all 18 ordered/checksummed migrations on fresh own PG16 |
| `node scripts/pg-migrations.js --verify` | S1; S2 after shadow | 0 | **PASS**, ledger before/after concurrency and account fixtures |
| `node scripts/pg-concurrency-smoke.js` | S1 | 0 | **PASS**, 8 concurrent clients, counter8, one idempotent row; no throughput claim |
| `DB_PATH=/tmp/streamatlas-ownership-20261024/pg46-export.sqlite node scripts/export-catalog-pg.js /tmp/streamatlas-ownership-20261024/pg46-catalog-export` then `node scripts/pg-catalog-import-disposable.js /tmp/streamatlas-ownership-20261024/pg46-catalog-export` | unchanged v45 importer at S1/S2 | 0 each | **PASS**, every field across 10 synthetic tables; 72 videos; no identity import |
| `node scripts/pg-schema-parity.js --sqlite /tmp/streamatlas-ownership-20261024/pg46-export.sqlite` | S1 | 0 | **PASS**, 62 SQLite / 62 PG schema tables, no missing tables/columns; static schema comparison |
| `node scripts/test-spring-account-parity-disposable.js --spring http://127.0.0.1:38081 --output reports/qa-spring-node-shadow-parity.json` | **S2, clean tracked tree** | 0 | **PASS**, actual Node/SQLite and Spring/PG: 7 cases, 14 full-response comparisons, 28 HTTP GETs, 0 differences/errors; both read-only snapshots unchanged; fixture cleanup PASS |
| `node scripts/qa-release-verify.js` | S2 fresh ZIP | 0 | **PASS**, 556 inventoried files, source digest `f8d75970944f3fe4f4a114a2ab02018988ee7815871a5f81a7f18fa0561789e2` |
| `node scripts/qa-route-diff.js --strict` | S2 fresh ZIP | 0 | **PASS**, 123 static routes, 218 OpenAPI operations, 0 static gaps |
| `node scripts/qa-dynamic-routes.js --strict` | S2 fresh ZIP | 0 | **PASS**, 8 modules / 62 regexes / 76 reviewed dynamic operations; typed/runtime parity remains separate |
| `node scripts/vendor-hls.js --verify` | S2 fresh ZIP | 0 | **PASS**, exact bundle/notices/license hashes and trusted registry ECDSA signature |
| `node scripts/audit-vendored.js`; `npm audit --omit=dev --audit-level=high` | unchanged S1/S2 dependencies | 0 each | **PASS**, 0 reported vulnerabilities; separate vendored hls.js audit included |
| `node scripts/generate-sbom.js /tmp/streamatlas-ownership-20261024/sbom46.json` | unchanged S1/S2 script | 0 | **PASS**, verified hls.js component/license/SHA256 included; metadata scope only |
| `npm run qa:security`; `npm run qa:infra`; `node scripts/doctor.js` | S1, unchanged relevant bytes at S2 | 0 each | **PASS**, source hygiene / static infrastructure policy / actual Node and FFmpeg checks; no pentest/provider approval claim |
| Terraform `init -backend=false -input=false` and `validate` for `media-cdn`, `queue`, `edge-waf` | unchanged infrastructure at S1/S2 | 0 each | **PASS**, run on isolated copies using Terraform1.12.2; no plan/apply/cloud API. media-cdn has pre-existing lifecycle-filter warnings described below |
| `docker compose -f deployment/aws/compose.yaml config --quiet --no-interpolate` | S1 committed export | 0 | **PASS**, empty temporary runtime env file in export only |
| `BUILDX_CONFIG=/tmp/streamatlas-ownership-20261024/buildx docker build -f deployment/aws/Dockerfile -t streamatlas-ci:checkpoint46 .` | S1 committed export; identical app/config at S2 | 0 | **PASS**, local image `sha256:dde138261db559facbe33f2e904bf6374af538d08f89d75401f6bd6db25a37f3`; no service deployment |
| `docker run --rm --network none -i rhysd/actionlint:1.7.7 - < .github/workflows/ci-main.yml` | S1/S2 workflow identical | 0 | **PASS**, workflow syntax/expression lint |
| `python qa/network-e2e.py --engines chromium firefox webkit --strict --output reports/qa-browser-results.json` using installed Playwright venv | S1, clean tracked tree | 1 | **NOT RUN** Chromium / Firefox / WebKit: all three browser executables absent. JSON correctly records unavailable engines, not passing checks |
| Actual browser axe/accessibility and new real HLS ABR/decoding | S2 | — | **NOT RUN**, same unavailable browser runtime; hosted evidence required |
| Offline Chromium audit | S2 | — | **NOT RUN** locally; no current runtime proof. Existing prior-SHA evidence remains historical |
| Physical Safari/iOS/Android, cloud/provider/production recovery acceptance | S2 | — | **NOT RUN**, outside this disposable synthetic checkpoint |

The S2 shadow report's complete schema was also passed through
`scripts/ci-summary.py::shadow_evidence`: PASS. Case coverage: anonymous, owner
custom preferences, another account, defaults, expired, closed and revoked.
Unauthorized preference reads return401; identity reads return200 with null user.
No token, cookie, raw response body or generated synthetic identity is in this file.

## Fresh extraction and cumulative source proof

`python scripts/build-qa-zip.py /tmp/streamatlas-ownership-20261024/StreamAtlas-v0.46.0-verified.zip`
returned0. ZIP CRCs and SHA256 sidecar verified; all **565** archived files compared
byte-for-byte with eligible tracked source. A new extraction ran `npm ci
--ignore-scripts --no-audit --no-fund`, release integrity, strict static/dynamic
contracts, vendor provenance, all431 Node tests and all46 Python tests: **PASS0**.
No Git metadata, database, credentials, private media, Maven target output or
untracked user report is needed or included. Executable modes are preserved.

Final cumulative delivery is `StreamAtlas-v0.46.0-complete.zip` with adjacent
`.zip.sha256`; its final checksum is external to the archive to avoid a circular
hash. The final package includes this evidence-only publication update. Its fresh
extraction is checked against every eligible publication file and the unchanged
S2 source manifest before delivery. Full regression above is from identical
application/test bytes, not a patched-file-only ZIP.

## Reproduced failures, corrections and sanitized limitations

- Initial pre-manifest Node run:425PASS/2FAIL. Both failures detected stale source inventory/attestation. Regenerated manifests from a clean staged-source export; final431PASS.
- First fresh ZIP:430PASS/1FAIL because a new shadow CLI test required Git metadata. Fixed only the test to assert actual Git/environment provenance or honest null metadata. Checkout and no-Git focused suites10/10PASS, then new ZIP431/431PASS. No application assertion or strict gate was disabled.
- Initial psql Docker wrapper omitted the synthetic role/database and received `role root does not exist`; corrected its fixed own-container target, then all protected DB checks passed. Initial schema CLI invocation omitted required `--sqlite`; corrected command passed. These were harness invocation errors.
- Sandboxed socket/JVM attach restrictions initially blocked real listeners/Mockito. Authorized local QA execution outside that restriction passed; no application security setting was weakened.
- Offline Maven packaging initially lacked a packaging plugin. Normal TLS-verified Maven resolution completed; transient proxy settings were mode0600 outside source and removed. No TLS bypass was used.
- Browser executable errors: `Executable doesn't exist` for Chromium headless shell1194, Firefox1495 and WebKit2215. Prior CDN/MCR retrieval attempts were forbidden; no unrelated installation was repeated.
- Terraform media-cdn validation returns0 with existing S3 lifecycle `filter`/`prefix` warnings (originals/protected). Add explicit filter blocks and revalidate before any future deployment/provider upgrade. No resources were created.
- SIGKILL cannot run Node cleanup; the crash-test supervisor explicitly kills its recorded orphan encoder. Container/init supervision and hardened multi-host execution remain required. SQLite fencing is not a distributed broker or SQL/filesystem power-loss atomicity proof.

## GitHub Actions and next work

Workflow: https://github.com/kawakaze430/StreamAtlas/actions/workflows/ci-main.yml

The workflow requires38 checks including independent Java unit/real-PG jobs,
full-row catalog parity, actual Node/Spring shadow proof, HLS provenance/advisories
and three real browser/axe jobs. Summary rejects missing/stale/duplicate evidence,
all-skipped integration, malformed test counts, dirty shadow source and matching5xx.
Main push is the authorized trigger. **Hosted run status is NOT RUN/unverified from
this environment**, not PASS: `gh api repos/kawakaze430/StreamAtlas/actions/runs
--method GET -f head_sha=<exact SHA> -f per_page=5` exits1 with `Forbidden`.
No exact run/job/artifact ID can be truthfully supplied. Inspect the workflow at
published main and obtain exact-SHA hosted results before accepting browser gates.

Next-agent instructions: `docs/CODEX_NEXT_PROMPT_46.md` (explicitly main only,
no branch/worktree/PR). Priorities: synthetic account migration and rollback,
additional authenticated Spring write/CSRF/role parity, durable multi-host private
uploads/jobs, supervised crash recovery, actual HLS cross-browser negative/quality
switching, and external acceptance dependencies in the117-task tracker. Local
vendoring, static contracts and two GETs do not establish full API/browser/cloud
parity, production readiness or legal/provider approval.
