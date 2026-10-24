# Checkpoint 40 verification

## Local environment
Node 22.16.0, Python, FFmpeg and FFprobe. No live PostgreSQL, Maven, AWS credentials or real native Safari/Firefox device test runtime available in this container.

## Completed
- `node --test tests/checkpoint38-chunk-store.test.js tests/private-media40.test.js`: PASS 8/8.
- `node --test --test-concurrency=2 tests/upload.test.js tests/checkpoint38-chunk-store.test.js`: PASS 15/15.
- `npm run qa:dynamic:strict`: PASS 60 reviewed matcher candidates, no changes.
- `npm run qa:inventory && npm run qa:release && npm run qa:release:verify`: PASS before final documentation regeneration; must rerun after documentation edits.
- `node --test --test-concurrency=2 tests/*.test.js`: PASS **309/309** after source manifest regeneration on a previous completed full run. After the last docs and browser-harness changes, one all-in-one attempt stalled after 254 test reports and was terminated by the command timeout; bounded runs covering **the same 50 test files** then passed: **223/223** (first 25 files) and **86/86** (remaining 25), total **309/309**. No attempt is described as passing if it timed out.

## Caveats
An earlier first 307-test full-suite attempt reported two failures solely because the inventory was not yet regenerated after edits. Those integrity failures were addressed, after which the 309-test suite passed. Fresh extraction and final-manifest results are recorded in the delivery response once completed.

## GitHub Actions results — distinct from container-local execution

On remote `main` at commit `af1b46d7`, the comprehensive workflow run [40009737368](https://github.com/kawakaze430/StreamAtlas/actions/runs/40009737368) recorded **PASS** for Node/contracts and PostgreSQL 16 + Java 21 Maven, but **FAIL** for Terraform parsing and real-browser strict axe-injection. The backend-specific workflow [40010957413](https://github.com/kawakaze430/StreamAtlas/actions/runs/40010957413) at later commit `c709b16b` recorded **SUCCESS** for disposable PostgreSQL/Maven. Security and legacy verification workflows also succeeded on `c709b16b`: [40010957607](https://github.com/kawakaze430/StreamAtlas/actions/runs/40010957607) and [40010957785](https://github.com/kawakaze430/StreamAtlas/actions/runs/40010957785). These are neither a staging migration nor full Spring API-parity proof.

Terraform failure: three AWS draft main.tf files used invalid inline nested-block notation. Updated HCL layout on remote `main` in commit `c709b16b`, plus older CI smoke invocation changed from `./scripts/ci-postgres-smoke.sh` to `bash scripts/ci-postgres-smoke.sh` (resolved exit 126). Browser failure: Chromium, Firefox and WebKit *did* complete network-navigation and access-denial checks, but the pinned axe-core script was injected inline and blocked by the application's strict `script-src 'self'` CSP. Corrected the **test harness only** to route the pinned JS via an ephemeral same-origin URL (`fd8b3bfc`); CSP remains strict. Do not mark browser or Terraform fully passing without inspecting new CI runs for that SHA.

The later comprehensive workflow [40011214555](https://github.com/kawakaze430/StreamAtlas/actions/runs/40011214555) at `fd8b3bfc` returned **PASS** for Node/contracts, PostgreSQL/Maven and Terraform/security/Docker; **FAIL** for actual axe WCAG findings: `aria-allowed-attr` (critical, one element) and `link-name` (serious, three icon-only links), consistent in Chromium, Firefox, and WebKit. In the local cumulative ZIP the search/links have been corrected and the axe failure report now includes bounded selector diagnostics; the fixes were directly pushed on `main` at `923528bc`, but **a clean hosted pass on this ZIP has not been established**.

Source code changes committed to remote `main`, in order:
- `f295c540` nonsecret runtime example
- `5daeba08` upload/media hardening code and regression tests
- `af1b46d7` repaired source integrity manifests
- `c709b16b` Terraform HCL and legacy shell invocation
- `fd8b3bfc` test-only CSP/axe browser fix
- `923528bc` three labeled header links, corrected search input ARIA, and more precise axe diagnostics. Static source integrity hashes updated atomically.

**Important:** GitHub app `main` still carries the v0.38 base plus these specific improvements; it is not synchronized with the complete v0.40 cumulative archive. All independent local tests on this ZIP must be executed on a fresh extraction. Hosted results above apply to the *exact recorded Git commit*, not the ZIP's v0.40 source.

## NOT RUN / unverified
On the ZIP in this local container: actual PostgreSQL migrations/concurrency, Maven/Spring compile, networked multi-engine browser acceptance, public cloud staging, independent penetration test, jurisdiction/age/consent/rights/provider/moderation acceptance. Real GitHub Actions smoke on the older remote app does not substitute for full v0.40 acceptance.
