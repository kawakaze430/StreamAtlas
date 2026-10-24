# StreamAtlas current-main CI and test evidence

Date: 2026-10-24, Asia/Kolkata. This report supersedes the earlier blocked-runtime report; it does not claim production acceptance.

## Revisions, scope, and publication

- Existing branch: `main`. No branch, worktree, PR, fork, tag, force-push, or deployment was created.
- Starting local revision: `9340a625672f674e5a3be4744dad7e3db05f77f1`.
- Newer remote main safely fast-forwarded and preserved: `923528bceeeb6b64b391cc1ad2be5826a5b6cbe9`. It already restored the non-secret runtime example and added upload/private-media, Terraform, CSP/browser, and accessibility fixes.
- **Validated source/CI revision: `60a6ebae711af7bebd33cdba6e28ed7480299553`.** All local source was clean after this commit except the pre-existing untracked external evidence file. This report is a subsequent documentation-only commit; its publication SHA and remote verification are supplied in the handoff.
- Application version remains **0.38.0**. The complete v0.39 archive is unavailable. Its synchronization, reviewed dynamic-route baseline, and cumulative ledger delivery remain **NOT RUN**; no version or release completion was invented.
- Direct-main publication uses an ordinary fast-forward push after fetching and checking concurrent changes. No existing upstream implementation fixes were overwritten.

## Delivered changes

1. Split Node batches, PostgreSQL, Spring, browser engines, offline Chromium, security, Terraform modules, and Docker into independently scheduled jobs/matrices. A failed independent check no longer suppresses the other categories. Necessary migration prerequisites remain guarded.
2. Preserve actual command exits and logs in per-check JSON. Explicit NOT RUN checks have null exits and never become PASS. Capture/report errors cannot retain stale passing evidence.
3. Aggregate artifacts into a full-SHA JSON and GitHub step summary. Reject stale/duplicate metadata, missing raw browser/axe evidence, and empty or entirely skipped Node/Python/Spring tests. Failed and cancelled jobs remain failures. Missing dynamic coverage keeps `coverage_complete=false`.
4. Add 15 meaningful MockMvc controller cases using the existing Spring test dependency. No application implementation or POM changes. These tests establish controller behavior, not PostgreSQL-backed Spring behavior or Node/Spring API parity.
5. Write sanitized browser JSON even when fixtures, dependency import, startup, or browser launch fails. Include source/runtime metadata and actual browser versions when available. Preserve strict exit behavior, CSP, axe assertions, and process cleanup.
6. Exclude reports/build output from the Docker context; ignore Maven output and retain the non-secret runtime template. Include `.dockerignore` in source integrity coverage.
7. Save the complete next-Codex prompt at [docs/CODEX_NEXT_MAIN_TEST_PROMPT.md](docs/CODEX_NEXT_MAIN_TEST_PROMPT.md), including mandatory direct-main pushes and no branches or PRs.

## Completed validation

PASS denotes the specific completed check below, not hosted CI or production readiness.

| Check | Result | Exit | Actual evidence |
| --- | --- | --- | --- |
| Node regression batch 1 | PASS | 0 | Node 22.16.0; 229 tests, 229 passed, 0 failed/skipped/cancelled |
| Node regression batch 2 | PASS | 0 | Node 22.16.0; 86 tests, 86 passed, 0 failed/skipped/cancelled |
| Python browser-report/summary tests | PASS | 0 | Python 3.12.14; 21 tests, all passed |
| Java 21 Maven controller tests | PASS | 0 | Maven 3.9.11; complete Temurin JDK 21.0.9; 15 tests, 0 failures/errors/skips |
| PostgreSQL live migrations | PASS | 0 | PostgreSQL 16.15; 18 ordered migrations applied and checksum ledger verified |
| PostgreSQL concurrency and final ledger | PASS | 0 | 8 clients; counter=8; one idempotent row; ledger verification passed afterward |
| Release source integrity | PASS | 0 | 468 source files; digest `469006a4c185b49b8e730da0b3a0cbb1cea313b0ce651c370f6650b1fe2e47da` |
| Static API contract gate | PASS | 0 | 123 static operations, 184 OpenAPI operations, 0 unreviewed static operations |
| Source security assertions | PASS | 0 | 468 inventoried files; script explicitly does not establish CVE/penetration-test coverage |
| Infrastructure policy assertions | PASS | 0 | All static guardrails passed; provider verification/deployability remain false |
| SBOM generation | PASS | 0 | Metadata-only inventory; 0 locked third-party packages; generated in disposable image |
| Doctor / server and frontend syntax | PASS | 0 | Node 22.16.0; FFmpeg/FFprobe 7.1.5 in full checkout |
| Terraform media-cdn | PASS with warnings | 0 / 0 | Init without backend and validate; provider warnings require future attention |
| Terraform queue | PASS | 0 / 0 | Init without backend and validate |
| Terraform edge-waf | PASS | 0 / 0 | Init without backend and validate |
| Compose configuration | PASS | 0 | Empty ignored local fixture; no services started |
| Docker image build | PASS | 0 | New source image built using repository Dockerfile, normal artifact/TLS verification |
| Workflow lint / Bash syntax | PASS | 0 | actionlint 1.7.7; `bash -n scripts/ci-check.sh` |
| Registry dependency audit | PASS, reused evidence | 0 previously | Prior `npm audit --omit=dev --audit-level=high` found 0 vulnerabilities. Package manifest/lockfile remain byte-identical; no redundant audit was run. |

The 315 Node tests include the seven new command-evidence regression cases. The 21 Python tests include 17 summary-validation cases and four browser bootstrap/cleanup cases. Together with the 15 Java cases, **351 tests passed**; runtime checks without test counts are listed separately.

## Executed commands and reproducibility

Commands ran from `/workspace/StreamAtlas` unless a separate context is named. Tool setup and raw diagnostics remain outside tracked source under `/tmp/streamatlas-ownership-20261024`.

### Node and Python

The Node 22.16.0 binary was obtained from the checksum-verified official Node-based Docker image and used against the complete checkout with installed Python and FFmpeg. Both batches executed the workflow's same sorted test split and `--test-concurrency=2`, with an additional 12-minute local timeout:

```sh
PATH=/tmp/streamatlas-ownership-20261024/node22/bin:$PATH
mapfile -t tests < <(find tests -maxdepth 1 -name '*.test.js' | sort)
midpoint=$(( (${#tests[@]}+1)/2 ))
node --test --test-concurrency=2 "${tests[@]:0:midpoint}"
node --test --test-concurrency=2 "${tests[@]:midpoint}"
python -m unittest discover -s qa/tests -p 'test_*.py' -v
npm run qa:release:verify
npm run doctor
npm run qa:contracts:strict
npm run qa:security
node --check src/server.js
node --check public/app.js
```

Each final command exited **0**. Infrastructure/SBOM commands `npm run qa:infra` and `npm run qa:sbom` also exited **0** in the disposable Node 22 image. Node tool version probes and the final worktree/diff checks exited **0**.

### Disposable PostgreSQL 16

```sh
docker run --detach --rm --name streamatlas-qa-pg-20261024 --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust --env POSTGRES_USER=sa_test \
  --env POSTGRES_DB=sa_disposable_20261024qa postgres:16 -c listen_addresses=127.0.0.1
node scripts/pg-migrations.js --check
node scripts/pg-migrations.js --apply
node scripts/pg-migrations.js --verify
node scripts/pg-concurrency-smoke.js
node scripts/pg-migrations.js --verify
```

All commands exited **0**. The Node commands used a temporary `psql` launcher calling `docker exec -i` inside this one container. Both the protected runner and the actual client used `PGHOST=127.0.0.1`, `PGUSER=sa_test`, `PGDATABASE=sa_disposable_20261024qa`, and `SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS`; remote/service overrides were cleared in that test process. Trust authentication was limited to this newly created container, whose network mode was `none`, listen address was loopback, and port bindings were `{}`. No external database was contacted. `docker stop streamatlas-qa-pg-20261024` exited **0** and removed the test container/data.

PostgreSQL image digest: `sha256:9e2cf6287f25c3151f4c9421ccce2b17f3e60061c111a29165e0d2cdd9ff0a97`. Server: `16.15 (Debian 16.15-1.pgdg13+2)`.

### Java 21

Final command, exit **0**:

```sh
JAVA_HOME=/tmp/streamatlas-ownership-20261024/jdk-21 \
MAVEN_OPTS=-Djavax.net.ssl.trustStore=/etc/ssl/certs/java/cacerts \
/tmp/streamatlas-ownership-20261024/apache-maven-3.9.11/bin/mvn \
  -U -s /tmp/streamatlas-ownership-20261024/maven-settings.xml \
  -f backend-spring/pom.xml -B -ntp \
  -Dmaven.repo.local=/tmp/streamatlas-ownership-20261024/m2 -DfailIfNoTests=true test
```

Maven 3.9.11's official archive SHA-512 was verified. The complete JDK was extracted from official image `maven:3.9.11-eclipse-temurin-21`, digest `sha256:6fdc855a6ed81d288ca7ca37ac6ff5e9308b612485c0801d70b25a858c83d237`. Injected outbound proxy configuration was kept in a temporary mode-0600 settings file; no values were printed or committed. The host system trust store preserved TLS verification.

Earlier setup attempts exited **1**: direct Maven DNS resolution failed; the host Java runtime lacked a usable Java 21 compiler (`release version 21 not supported`); the extracted JDK initially lacked the environment CA (`PKIX` dependency-resolution failure). These were diagnosed and corrected using the existing proxy, complete JDK, and system trust store. No application change, expected checksum alteration, or TLS bypass was used to resolve them.

### Terraform, Docker, and workflow lint

Terraform 1.12.2's official archive SHA-256 was verified. Each selected module was copied to a temporary directory before validation, so no backend, state, provider cache, or lockfile output entered tracked source:

```sh
terraform -chdir=<temporary-module-copy> init -backend=false -input=false
terraform -chdir=<temporary-module-copy> validate
```

Both commands exited **0** for each of `media-cdn`, `queue`, and `edge-waf`. Media module warnings concern provider validation requirements in a future version; they are not recorded as a clean warning-free run. No plan/apply or AWS credentials were used.

From the isolated staged-source export, exits **0**:

```sh
touch deployment/aws/.env.runtime
docker compose -f deployment/aws/compose.yaml config --quiet --no-interpolate
BUILDX_CONFIG=/tmp/streamatlas-ownership-20261024/buildx \
  docker build -f deployment/aws/Dockerfile -t streamatlas-ci:qa-20261024 .
```

Built image ID: `sha256:6506f745fede2ca05a689008c731432a85427923f8da7ace94d72a60a9fb3547`. The source export came from the reviewed/staged main index using `git checkout-index --all`, with no Git branch/worktree created. Ignored/private/runtime files were excluded. Only disposable local test containers ran; the public gateway and production services were not started.

Workflow commands, exits **0**:

```sh
docker run --rm --network none -i rhysd/actionlint:1.7.7 - < .github/workflows/ci-main.yml
bash -n scripts/ci-check.sh
```

The actionlint image digest is `sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9`. An initial host `go install` attempt exited **1** (`Go: Unknown option: install`); the verified Docker tool was used instead.

### Corrected local test-context failure

The first two Node batches were attempted inside the production image, exiting **1**: batch 1 had 226 passes / 3 failures; batch 2 had 84 passes / 2 failures. Four failures were missing `.github` files, intentionally excluded by the production Docker context; the fifth was the image's missing Python executable. The same context caused source-integrity/security commands to exit **1** for missing workflow files. These were test-environment failures, not reproduced application failures. Repository tests were then run with Node 22.16.0 in the full checkout containing those inputs and Python; both complete batches and the affected gates passed. Production image exclusions and assertions were not weakened to manufacture passing results.

## Current limitations: NOT RUN or unverified

| Category | Result | Concrete blocker |
| --- | --- | --- |
| Chromium | NOT RUN | Pinned Playwright browser executable unavailable; CDN download denied |
| Firefox | NOT RUN | Pinned browser executable unavailable |
| WebKit | NOT RUN | Pinned browser executable unavailable |
| Real-browser axe accessibility | NOT RUN | No engine launched; no runtime WCAG/keyboard checks executed |
| Additional offline Chromium audit | NOT RUN in this pass | No local Chromium; prior offline evidence was not represented as a new run |
| Reviewed dynamic matcher gate | NOT RUN | Reviewed v0.39 implementation/baseline not supplied |
| Hosted Actions results / artifacts | Unverified | Private Actions API returns `Forbidden`; no hosted PASS or run ID invented |
| v0.39 synchronization | NOT RUN | Complete archive unavailable |
| Spring database integration / full Node parity | NOT RUN | Controller mocks and migration success do not establish this broader behavior |

Pinned Playwright 1.56.0 was installed in an isolated Python environment. Browser installation exited **1**: `403 Domain forbidden` from `cdn.playwright.dev` and `playwright.download.prss.microsoft.com`. Pulling the official browser container also exited **1** with `Forbidden`; those artifacts were not used. No verification or network policy was bypassed.

The actual strict command was executed on clean tracked source at `60a6ebae711af7bebd33cdba6e28ed7480299553`:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/streamatlas-ownership-20261024/browsers \
SA_QA_REQUIRE_AXE=1 \
/tmp/streamatlas-ownership-20261024/browser-venv/bin/python qa/network-e2e.py \
  --engines chromium firefox webkit --strict --output reports/qa-browser-results.json
```

Exit **1**. Bootstrap passed; every engine reported `unavailable` and zero checks. The report correctly recorded Playwright 1.56.0, Python 3.12.14, Node 24.19.0 for this bootstrap-only local attempt, the exact Git SHA, and `tracked_worktree_dirty=false`. This is a NOT RUN runtime result, not passing browser behavior or an application defect. The ignored local JSON was not committed.

## GitHub Actions and next testing

The private-repository lookup below exited **1** with `Get "https://api.github.com/repos/kawakaze430/StreamAtlas/actions/runs": Forbidden`:

```sh
gh api repos/kawakaze430/StreamAtlas/actions/runs \
  --jq '.workflow_runs[:10] | .[] | {id,head_sha,name,status,conclusion,html_url}'
```

Git HTTPS fetch/push access has worked; this does not establish Actions API permission. No secrets or token values were requested. The revised workflow is configured to execute on the final main push, but scheduling/completion cannot be claimed until observed.

- [Workflow definition at validated source revision](https://github.com/kawakaze430/StreamAtlas/blob/60a6ebae711af7bebd33cdba6e28ed7480299553/.github/workflows/ci-main.yml)
- [Main workflow runs listing](https://github.com/kawakaze430/StreamAtlas/actions/workflows/ci-main.yml?query=branch%3Amain) — navigation only, not a verified run link.
- The new final artifact is `streamatlas-final-evidence` containing `ci-summary.json`; per-job artifacts use `streamatlas-ci-*`. Separate artifact directories preserve duplicate detection. No hosted artifact existence or download link is claimed.
- The complete executable handoff prompt is [docs/CODEX_NEXT_MAIN_TEST_PROMPT.md](docs/CODEX_NEXT_MAIN_TEST_PROMPT.md). It explicitly requires **existing main only, no branch or PR, ordinary direct-main pushes, exact-SHA evidence, and preservation of concurrent changes**.

Minimum remaining action: permit the required browser download domains or use the installed browser runtimes in hosted CI; enable supported private Actions/checks/artifact access and inspect the final main SHA. Obtain the authentic v0.39 archive before synchronizing that release. Keep Spring database integration, optional legacy/HLS suites, and external provider/legal/production work distinct from this completed local validation. Existing legacy workflows were preserved.

No cloud deployment, billing operation, production identity, real-user data, explicit media, branch-protection bypass, or auto-edit/auto-push mechanism was introduced into CI.
