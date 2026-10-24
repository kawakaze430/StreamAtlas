# One narrow external-runtime validation — NO Codex execution needed if GitHub Actions works

## Zero-Codex path

Open the private repository GitHub Actions tab and dispatch these two workflows on an exact SHA. The source branch must contain v0.39.0 before validating v0.39.0; v0.38 results only apply to their exact commit.

- `.github/workflows/postgres-disposable.yml` — GitHub ephemeral PostgreSQL 16, migration apply/ledger, concurrency, Spring Boot Java 21 Maven tests.
- `.github/workflows/qa-checkpoint21.yml` — Chromium/Firefox/WebKit Playwright browser network runner and contract gates.

Do not confuse the existence of workflow YAML with proof of execution. Export redacted job steps, exit codes, test reports and exact SHA for the owner engineer.

## If CI does not start: minimal Codex Cloud prompt

You are QA-only for the exact StreamAtlas v0.39.0 GitHub commit. The previous Codex run performed zero test checks because Docker PostgreSQL image, Maven and Playwright browser executables were absent. Unlike the previous instruction, **you may install missing TEST-ONLY runtimes** (PostgreSQL 16 disposable loopback instance or official postgres:16 Docker image, Maven using Java 21, Python Playwright browser executables and OS dependencies), provided network and permission allow. Do not change application source. If installs are impossible, mark NOT RUN with a concrete blocker and stop; do not keep trying alternatives or duplicate Node/FFmpeg/offline Chromium suites. Execute only:

1. Disposable PostgreSQL 16: `node scripts/pg-migrations.js --apply`, `--verify`, and `node scripts/pg-concurrency-smoke.js` with `PGDATABASE=sa_disposable_<unique>` and `SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS` and loopback host, never touching an existing/shared database.
2. Java 21 Maven: `mvn -f backend-spring/pom.xml -B -ntp test`.
3. Playwright pinned to repository workflow version, install Chromium/Firefox/WebKit, then `python qa/network-e2e.py --engines chromium firefox webkit --strict --output reports/qa-browser-results.json`.

Use synthetic non-explicit media only. No AWS/Azure credentials, deployments, production data, payments or public service. Produce ONLY `CODEX_EXTERNAL_TEST_EVIDENCE.md`: commit, versions, commands, exit codes, PASS/FAIL/NOT RUN, redacted logs. Stop after these checks. Main engineer owns code fixes.
