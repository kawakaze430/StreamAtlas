# StreamAtlas v0.39.0 — dynamic API change detection and external-runtime handoff

**Source provenance:** Complete cumulative upgrade from v0.38.0 user-supplied archive (`0f35139146371468e3862481e9ec13c8de4afeb225aa69eaef0b36e04c458978`). No application streaming/authorization code modified in this checkpoint.

## Engineering changes

- Added `scripts/qa-dynamic-routes.js`, a conservative inventory for 60 source-level regex API matcher candidates in existing handlers. `npm run qa:dynamic:strict` fails if regex matchers are newly introduced, modified, or removed without the baseline being deliberately updated. It writes an inspectable JSON report. This is **NOT** a dynamic endpoint contract-completeness claim and cannot determine HTTP method or behavioral parity.
- Added regression test `tests/qa-dynamic39.test.js` that appends a novel API matcher in a temporary source copy and demonstrates strict gate failure, while keeping original inputs untouched.
- Enabled the dynamic gate in `.github/workflows/qa-checkpoint21.yml` and added explicit version diagnostics to `.github/workflows/postgres-disposable.yml`. Both workflows remain unverified on GitHub-hosted infrastructure. No external runs are asserted.
- Updated package/lockfile/OpenAPI contract metadata and extended all 117 task rows with checkpoint 39 evidence, preserving conservative A06/A07 PARTIAL statuses.

## External Codex evidence received (2026-10-23)

- Commit `a1b73300336573b7fccd936669b830a6157a63ed` was tested for **runtime availability**, not application behavior.
- GitHub check-runs request returned Forbidden; no passing hosted evidence was established there.
- PostgreSQL 16 tests: **NOT RUN**, no database tools or server. Docker was present but without an image; installation/image pulls were excluded by prior restrictive instruction.
- Maven with Java 21: **NOT RUN**, `mvn` absent despite Java being available.
- Chromium/Firefox/WebKit: **NOT RUN**, Python Playwright was installed but browser executables were missing; strict wrapper exited 1 due availability.
- **Conclusion:** No external category PASS; no application defect demonstrated. No need to spend additional Codex allowance on the same no-install instruction.

## Recommended next external execution

1. Prefer existing private GitHub Actions workflow dispatch with synthetic fixtures: PostgreSQL + Spring (`postgres-disposable.yml`) and real browser matrix (`qa-checkpoint21.yml`). Their YAML already provisions PostgreSQL container, Maven environment, Python Playwright/browser binaries. Actions must be enabled and executed with repository access; no passing evidence yet.
2. If Actions unavailable, explicitly allow a disposable test environment to *install* the missing dependencies and run precisely these checks once. Nothing may connect to shared databases, private customer records or paid cloud services.
3. Give the resulting logs/commit SHA back to the primary engineer, who owns fixing actual application failures, not external Codex.

## Release limits

No real PostgreSQL or Maven compilation, network Chromium/Firefox/WebKit or mobile HLS, independent security testing, legal/provider acceptance, payment processing, live AWS provisioning or worldwide adult-content release. Synthetic, non-explicit fixture content only. Statuses: LOCAL 26, PARTIAL 51, PREPARED 10, BLOCKED 19, NOT_STARTED 11.
