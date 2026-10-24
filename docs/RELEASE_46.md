# StreamAtlas v0.46.0 — private engineering checkpoint

This cumulative checkpoint builds on v0.45.0 main
`59198fe61a2f6083794d47954c034e9f0474e3be` and preserves its previous functionality.
The platform remains a private synthetic-media prototype. Exact tested source
SHA, commands, exit codes and PASS/FAIL/NOT RUN results are recorded in
`CODEX_MAIN_TEST_EVIDENCE.md`; that file controls any final test claim below.

## Implemented

- **B01/B03/J01:** Real self-hosted hls.js 1.7.3, upstream license/notice,
  SHA-256 bundle pins, SHA-512 npm archive integrity and npm-registry ECDSA
  signature verification. The checked vendor enters the SBOM and a separate
  advisory audit. Local asset/CSP compatibility permits MSE media blobs while
  hls.js runs without blob workers. This does not prove browser decoding or ABR.
- **A06/A07:** A mandatory dynamic contract gate reviews 76 method/path
  operations across 62 API regexes and eight modules. OpenAPI grows from 184 to
  218 operations, with typed request schemas and private-media range contracts.
  Drift, omitted operations and orphaned review entries fail closed. Synthetic
  negative authorization/CSRF tests complement this static inventory.
- **E02/E03/J08:** SQLite lease/attempt fencing and private per-attempt staging
  prevent a stale worker committing, failing or deleting a successor's output.
  Shutdown/lease loss aborts scanner/probe/encoder children and waits for close.
  Process tests exercise restart, takeover, two-crash dead-letter limits and
  symlink/foreign-output rejection. SIGKILL needs external process supervision;
  the crash-test supervisor explicitly terminates its recorded orphan encoder.
- **E01:** Offline multipart planning and receipt validation bind the expected
  owner, upload, size, part boundaries and SHA-256 receipts. Provider composite
  checksum is distinct from whole-file integrity. This performs no signing,
  network upload or publication and never reports provider storage verified.
- **F06/F07:** Spring now implements Node-compatible
  `GET /api/auth/me` and `GET /api/me/preferences[?expanded=1]` against PostgreSQL
  sessions/accounts. Reads use bound JDBC parameters, honor expired/revoked/
  closed accounts, scope preferences to the session owner and return sanitized
  storage errors. No login, credential write or full API migration is claimed.
- **F08:** An explicit synthetic-only loopback shadow reader compares those two
  GET contracts with bounded rate, time and body size. It refuses redirects and
  remote/ambiguous origins; output contains status/counts/digests, never cookies
  or response bodies. Matching 5xx responses fail readiness. Output always
  leaves cutover and full authorization parity unapproved.
- **A01/A08:** Cumulative source packaging excludes compiled/runtime/private
  artifacts, rejects unsafe paths and preserves executable modes. Deliverables
  include an archive checksum and verification from a fresh extraction.

## Verification boundaries

The disposable PostgreSQL 16.15 runtime passed all 18 protected migrations,
verification and eight-client concurrency/idempotency checks. The existing
v0.45 ten-table importer also passed exact synthetic full-row comparison.
Java 21 Maven passed 24 unit tests, with seven real PostgreSQL account tests
executed separately under explicit disposable guards. Final source regression,
actual backend shadow results and packaging evidence are in
`CODEX_MAIN_TEST_EVIDENCE.md`.

Current Chromium/Firefox/WebKit runtime results are **NOT RUN** locally when the
browser binaries cannot be obtained. The configured hosted jobs must supply
exact-SHA results; a forbidden Actions API is not passing evidence. Earlier
checkpoint passes remain historical evidence for their own SHAs. No physical
Safari/iOS/Android, public CDN revocation or real ABR outcome is inferred.

## Reproduce relevant checks

Use Node 22.13+ and Python 3; Java requires a complete Java 21 JDK. Run protected
live PostgreSQL checks only on a newly created loopback `sa_disposable_*`
database with `SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS`. Never reuse a shared
or production database.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run qa:release:verify
npm run qa:contracts:strict
npm run qa:dynamic:strict
node scripts/vendor-hls.js --verify
node scripts/audit-vendored.js
npm run qa:security
npm run qa:infra
npm test
python -m unittest discover -s qa/tests -p 'test_*.py'
mvn -f backend-spring/pom.xml -B -ntp test
```

The ordinary Maven command deliberately skips opt-in PostgreSQL integration
when `SA_TEST_PG` is unset. The independent integration job must set `SA_TEST_PG=1`,
the disposable acknowledgment, `SA_TEST_PG_URL`, `SA_TEST_PG_USER` and synthetic
credentials, then execute:

```sh
mvn -f backend-spring/pom.xml -B -ntp -Dtest=SessionAccountPostgresTest -DfailIfNoTests=true test
```

The URL guard requires `jdbc:postgresql://127.0.0.1:PORT/sa_disposable_*`, without
query options. A skipped integration class is NOT RUN, regardless of unit passes.
See the main CI workflow for disposable service startup, protected migration
commands and the actual backend shadow harness.

## Tracker and remaining work

`AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_46.csv` preserves 117 task IDs and all
historical columns: **28 LOCAL, 60 PARTIAL, 10 PREPARED, 19 BLOCKED**. Only B01
moves to LOCAL for its specific vendoring criterion. The original 62 partial
requirements remain explicitly listed in `qa/partial-acceptance46.json` and the
companion roadmap; external production acceptance is false for every entry.

Next work is guarded synthetic account import, additional authenticated Spring
modules with write/CSRF parity, durable multi-host upload/job semantics, real
HLS browser failure tests, and checkpointed rollback/supervised failure drills.
Independent legal, identity/rights, provider, cloud security and staffed
operations acceptance remains outstanding. No cloud spend, real identities or
explicit media, provider/payment operation, public deployment or production
cutover is authorized by this checkpoint.
