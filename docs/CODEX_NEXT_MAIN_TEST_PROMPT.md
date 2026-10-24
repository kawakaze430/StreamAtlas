# Next Codex testing prompt — existing main only

Copy the prompt below into the next Codex task. Read the current repository instructions and workflow when that task begins; this document is a testing handoff, not evidence that any check passed.

---

You are the CI and testing engineer for the private repository `kawakaze430/StreamAtlas`. Own the remaining development and external-runtime validation through a factual evidence report.

**MANDATORY GIT RULE: Work directly on the existing `main` branch. Do not create a branch, worktree, pull request, fork, or tag. Never force-push, reset away local work, bypass branch protection, or overwrite concurrent changes. Commit and push ordinary fast-forward changes directly to `main` only. If direct-main writes are blocked, stop publication and report the exact blocker.**

## 1. Establish the actual current state

1. Read `docs/CODEX_MAIN_ONLY_TEST_INSTRUCTIONS.md`, this prompt, applicable `AGENTS.md` files, `.github/workflows/ci-main.yml`, and `CODEX_MAIN_TEST_EVIDENCE.md`.
2. Inspect the working tree before changing anything. Fetch `origin/main`, record full local and remote SHAs, and inspect any divergence and concurrent changes. Use the existing checkout and preserve all user files, including untracked evidence. Fast-forward safely where possible; never silently discard or replace newer main-only work.
3. Read `package.json`, the lockfile, and the current release manifests. Do not assume a version from this prompt. At handoff creation, the application was still v0.38.0; the claimed complete v0.39 archive was unavailable. Do not invent missing cumulative source, a reviewed route baseline, a 117-task ledger update, or a release/version bump. Synchronize a later archive only when its authentic complete contents are actually supplied, and verify the resulting file comparison before claiming completion.
4. Use injected GitHub authentication first. Check existing variable names/presence without printing values. Do not request tokens merely because a token environment variable is unset. Earlier Git fetch/push worked while the Actions/check-runs API returned `Forbidden`; test current access rather than assuming that remains true. Never ask for credential values in chat.

## 2. Prefer current-SHA GitHub Actions evidence

Inspect the comprehensive workflow at the exact current main SHA. Retrieve runs, jobs, step results, logs, test counts, and artifacts when access permits. An example lookup is:

```sh
gh run list --repo kawakaze430/StreamAtlas --workflow ci-main.yml --branch main --limit 10 --json databaseId,headSha,status,conclusion,url
```

Select only a run whose `headSha` equals the source SHA being evaluated. Inspect it with `gh run view <run-id> --repo kawakaze430/StreamAtlas --json headSha,status,conclusion,url,jobs` and inspect failed logs when needed. Download only required sanitized test artifacts into an ignored directory outside tracked source.

Inspect the `streamatlas-final-evidence` artifact and `ci-summary.json` produced by the current workflow. Confirm its full SHA, per-check command exits, actual counts, `metadata_errors`, job results, and `coverage_complete` flag. A successful summary step with missing checks is still incomplete coverage. Its `streamatlas-ci-check-v1` inputs must identify the same source commit; conflicting duplicates, malformed metadata, and stale SHAs invalidate the evidence. Keep each downloaded artifact in its own directory when reaggregating so duplicate files cannot overwrite each other. Use `python scripts/ci-summary.py --reports <download-directory> --output reports/ci-summary.json` with the selected `GITHUB_SHA` and actual `SA_CI_JOBS` JSON when reproducing the summary.

- Reuse passing evidence for that exact source revision. Avoid rerunning already passing suites without a relevant code change, unresolved concern, or invalid run.
- If no matching run exists, use the configured main-push trigger or `gh workflow run ci-main.yml --ref main --repo kawakaze430/StreamAtlas`; confirm scheduling and the selected SHA. Do not dispatch duplicate runs unnecessarily.
- Preserve the underlying command exit status when capturing output. A successful install, open port, empty test report, green upload step, or successful push is not a passing functional test.
- Do not count skipped, cancelled, timed-out, unavailable, expected-failure, or zero-test outcomes as PASS. API access denial makes the remote result unverified; it does not prove that tests failed or never ran.
- If an early step fails, inspect which later checks actually executed. Continue independent checks where safe, without weakening failure gates. Do not automatically rewrite application code or regenerate integrity manifests inside CI to produce a green run.

## 3. Validate every required category

Use the current workflow's commands and supported result artifacts. Where local fallback is useful, first inspect available runtime versions and dependencies. Do not spend time installing unrelated runtimes when hosted execution or an external prerequisite is the real blocker.

| Category | Required evidence and interpretation |
| --- | --- |
| Node regression | Run the workflow's bounded Node test batches with its pinned Node version, locked installation, and synthetic FFmpeg prerequisites. Record executed files, test/pass/fail/skip counts, and each batch's exit code. Check doctor and syntax gates separately. |
| API contracts | Run `npm run qa:contracts:strict`. Run the dynamic route review gate only when its implementation, npm command, and reviewed baseline are genuinely present. Missing `scripts/qa-dynamic-routes.js`, `qa/dynamic-route-reviewed-baseline.json`, or `qa:dynamic:strict` means that gate is NOT RUN; never fabricate an all-approved baseline. |
| Source integrity | Run `npm run qa:release:verify` before any inventory regeneration. Diagnose all missing or mismatched inputs. Restore authentic missing inputs or make a reviewed intentional source fix; do not rewrite checksums merely to bless unexplained drift. After intentional source changes, refresh the repository's source inventory/manifests in the supported manner, inspect the changed file list, then verify again. |
| PostgreSQL 16 | Use only a new disposable local/CI database. Bind its published port to loopback. Verify the server major version, selected database, role, and guards before mutation. Run protected migration check/apply/verify, concurrency, and post-concurrency ledger verification. No shared, existing user, staging, or production database is permitted. |
| Java 21 / Spring | Run `mvn -f backend-spring/pom.xml -B -ntp -DfailIfNoTests=true test` under Java 21, as the current workflow requires. Inspect Maven/Surefire reports and actual non-skipped testcase counts. Distinguish successful compilation from executed unit/integration tests. If no tests exist or zero execute, report test coverage NOT RUN and the zero-test gate failure; do not claim Spring/Node API parity. |
| Chromium / Firefox / WebKit | Use the workflow's pinned Playwright/browser dependencies. Run the strict real localhost browser suite below. Inspect each engine's actual checks and errors, not just the aggregate exit code. An unavailable executable is NOT RUN for that engine. |
| Accessibility | Require pinned local axe-core and `SA_QA_REQUIRE_AXE=1`. Verify actual axe checks, zero violations, and relevant keyboard checks. Preserve application CSP. Do not substitute offline DOM injection for network/browser behavior or claim full accessibility certification. |
| Security / dependencies | Run source-security and infrastructure-policy commands, dependency audit, and SBOM checks as defined by the workflow. Record audit scope; a lockfile with no third-party dependencies does not establish application security. Never print secret values or upload credentials. |
| Terraform | Validate every workflow-selected module with `init -backend=false -input=false` and `validate`. Keep checksum/TLS verification enabled. No `apply`, live provider integration, cloud credentials, or remote backend access. Missing Terraform is NOT RUN. |
| Docker | Verify the Compose configuration and build the workflow's image with an isolated tracked-source context that excludes secrets, databases, media, and temporary files. Do not start the public gateway or deploy anything. Distinguish Docker/Buildx environment errors from Dockerfile failures. |

Protected PostgreSQL commands, from the repository root:

```sh
node scripts/pg-migrations.js --check
node scripts/pg-migrations.js --apply
node scripts/pg-migrations.js --verify
node scripts/pg-concurrency-smoke.js
node scripts/pg-migrations.js --verify
```

Required live-DB guards include `PGHOST=127.0.0.1`, a unique `PGDATABASE` beginning `sa_disposable_`, a local test role, and `SA_PG_DISPOSABLE=YES_I_ACCEPT_DATA_LOSS`. Clear remote-host/service overrides only in the isolated test process. Never reuse unknown inherited DB targets. Check PostgreSQL 16 before running mutation commands. Destroy only test resources you created.

Strict browser command, from the repository root:

```sh
SA_QA_REQUIRE_AXE=1 python qa/network-e2e.py --engines chromium firefox webkit --strict --output reports/qa-browser-results.json
```

Use the current workflow's optional offline audit as separate evidence; do not repeat it if already passing for the same source and dependencies. Browser fixture identities must remain synthetic, temporary, and private. Do not upload credentials, private media, session cookies, or raw request headers in artifacts.

## 4. Fix only reproduced failures and verify the final source

For each failure, read the exact command/log, identify whether the cause is environment, test infrastructure, application behavior, or unavailable external access, and reproduce it safely. Make the smallest necessary fix directly on existing `main`. Preserve concurrent updates and existing security assertions. Do not add unrelated features, disable assertions, skip failing engines, relax CSP/TLS, or change expected hashes to manufacture passing results.

Rerun the failing gate plus the relevant regression coverage. Do not rerun unrelated already-passing suites. Before each push, fetch main again, inspect any concurrent changes, and preserve them. Never force-push or automatically overwrite a conflicting file. If a source change affects a previous PASS, invalidate that result and obtain fresh evidence for the new source SHA.

Push directly to `main`. Confirm the full remote SHA with a read-only Git operation and confirm the tracked file changes. Retrieve the matching workflow run at that final source SHA. If the evidence report is then committed separately, label it as a documentation-only publication and distinguish that commit from the tested source commit; do not claim unobserved CI on either.

## 5. Deliver the evidence and next remaining work

Update `CODEX_MAIN_TEST_EVIDENCE.md` directly on main with:

- Full tested source SHA, final remote/publication SHA where available, runtime versions, intentional tracked changes, and file-sync verification.
- Every executed test command and exit code, exact PASS / FAIL / NOT RUN results, executed test counts, sanitized errors, and skipped/zero-test distinctions.
- Matching Actions run/job links and artifact links, or the exact access blocker if unavailable. Artifact names or upload-step success alone do not prove files exist.
- Confirmed fixes, remaining reproduced defects, unresolved environments, and the minimum concrete next action for each blocker.
- A clear statement of what development/testing is complete and what remains external. Do not claim v0.39 synchronization, Spring API parity, production readiness, or public-release acceptance without corresponding evidence.

Leave a concise handoff describing remaining testing, not an unbounded feature rewrite. Update this prompt only if new verified workflow facts make it stale. Do not commit runtime databases, `.env.runtime`, secret files, logs, screenshots, browser profiles, private media, archives, or generated temporary output. Preserve pre-existing user work.

## Operating limits

Use synthetic, non-explicit media and disposable identities only. No AWS/Azure/public/production deployment, cloud-credit spend, payment operation, production credentials, real-user data, or live adult-content provider integration. Legal/provider approvals, effective age assurance, participant identity/consent/licensing review, live cloud recovery, and independent security assessment remain external prerequisites unless separately authorized and genuinely completed. Existing tests or Terraform files cannot satisfy those requirements.

**Repeat: do not create any branch or PR. Commit and push directly to existing `main` only; preserve concurrent work and never force-push.**
