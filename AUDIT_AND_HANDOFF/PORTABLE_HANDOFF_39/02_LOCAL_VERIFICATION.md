# Checkpoint 39 — executed evidence (2026-10-23 UTC)

## Runtime

Private container, Node.js v22.16.0, npm, FFmpeg 7.1.5, FFprobe and offline Chromium. No Maven, PostgreSQL 16 server/psql, Docker daemon or external provider credentials in this local environment. Real multi-engine network browser acceptance cannot run here. Synthetic non-explicit fixture content only.

## Executed checks (source tree)

| Command | Result | Scope |
|---|---|---|
| `node --test tests/qa-dynamic39.test.js` | **PASS 1/1** | Source-regex inventory and injected route triggers strict failure |
| `npm run qa:dynamic:strict` | **PASS** | 60 baseline regex matcher candidates, 0 added/changed, 0 removed/changed; **not** all API operations |
| `npm run qa:contracts:strict` | **PASS** | 123 literal source operations, 184 OpenAPI operations, 0 literal omissions; regex authorization/method/schema gaps remain |
| `node --test --test-concurrency=2 tests/*.test.js` | **PASS: 305/305, 0 fail**, ~32 seconds | Local regression, does not exercise live PostgreSQL, Maven or native devices |
| `npm run doctor` | **PASS** | Node/FFmpeg/FFprobe availability |
| `npm run db:pg:check` | **PASS static only** | 18 ordered SQL migrations, never connected to PostgreSQL |
| `npm run qa:security` | **PASS local static checks** | Not CVE dependency audit or independent penetration test |
| `npm run qa:infra` | **PASS static checks**, deployable false | No AWS/Terraform apply |
| `npm run qa:browser:offline` | **PASS** | Local synthetic offline Chromium desktop/tablet/mobile widths, not real network Chrome/Firefox/WebKit |
| `npm run qa:inventory && npm run qa:release && npm run qa:release:verify` | **PASS** | Source checksums; run again after documentation finalized |

**Unsuccessful earlier attempt, not a pass:** `node --test --test-concurrency=1 tests/*.test.js` was terminated after the test runner stopped emitting progress after test 236. The following isolated `tests/ops19.test.js` passed 3/3. Complete rerun with concurrency=2 passed 305/305. This stall was not diagnosed as an application failure or a deterministic test regression.

## Clean-extraction testing of the finalized source

- A fresh extraction passed `npm run qa:release:verify` (466 tracked source files), `npm run qa:dynamic:strict` (60 matchers, 0 changes) and `npm run qa:contracts:strict` (123 literal operations, 0 undocumented). ZIP CRC and external SHA-256 were independently verified.
- The single whole-suite fresh-extraction run **did not finish**: it printed passing output through test 304, then stalled and was terminated by the runtime timeout. This is not recorded as a completed full-suite PASS.
- A fresh-extraction retry split the same complete set of 49 `tests/*.test.js` files into two non-overlapping batches: **221/221 PASS** (25 files) and **84/84 PASS** (24 files), both process exit code 0. All **305** tests completed successfully across the two batches. This establishes aggregate local regression coverage but does not prove a single uninterrupted whole-suite execution in the fresh archive.

## External evidence limitations

At remote commit `a1b73300336573b7fccd936669b830a6157a63ed`, Codex lacked PostgreSQL/client, Maven and all three Playwright browsers; categories marked **NOT RUN**, not FAIL. Its check-runs API request returned Forbidden. GitHub repository existence and checked-in workflow files were verified; no passing hosted-workflow execution is established. The codebase has not been deployed, and actual PostgreSQL/multi-browser/Maven tests remain required. Cloud, legal, independent security, partner and real-device acceptance remains outstanding.

## Archive acceptance

Fresh extraction validated ZIP CRC, SHA-256, source manifest and all tests via the two non-overlapping completed batches described above; the full-suite single-process timeout remains documented. Archive SHA-256 is delivered in a separate adjacent checksum text file; exclude that checksum from this self-hashed archive to avoid circularity.
