# StreamAtlas main-only external CI/test evidence

Report date: 2026-10-24, Asia/Kolkata (UTC+05:30). Scope: current main, as explicitly confirmed by the user after the v0.39 archive could not be located.

## Exact revisions and synchronization

- Initial checkout: `a1b73300336573b7fccd936669b830a6157a63ed` (application v0.38.0), on the pre-existing local branch `work`.
- Fetched remote main: `f3b796274923bbca3c2cacb3ba79ac72e9f7d089`.
- Instructions read first from main: [docs/CODEX_MAIN_ONLY_TEST_INSTRUCTIONS.md](https://github.com/kawakaze430/StreamAtlas/blob/f3b796274923bbca3c2cacb3ba79ac72e9f7d089/docs/CODEX_MAIN_ONLY_TEST_INSTRUCTIONS.md).
- **Final source/CI revision: `008b101fffe516d7651cb99f271883509b730072`**, pushed successfully directly to remote main. This report is published in a subsequent documentation-only commit; that containing commit's SHA is available in Git history and the accompanying handoff. No successful hosted validation is claimed for either revision.
- The existing local branch was renamed to `main`, set to track `origin/main`, and fast-forwarded. No additional branch, PR, fork, tag, force-push, or deployment was created.
- Remote main's two newer files, `.github/workflows/ci-main.yml` and the main-only instructions, were preserved. A content diff excluding those two additions confirmed all remaining tracked application, test, handoff, ledger, and manifest files still matched the original application commit.
- **v0.39 synchronization: NOT RUN / BLOCKED.** No complete archive or download location was supplied or present in the accessible workspace. No v0.39 files, reviewed dynamic matcher baseline, updated 117-task ledger, or release manifests were invented. The application remains v0.38.0.
- `git diff --exit-code origin/main -- .` exited **0** after the source/CI push. Local HEAD and `git ls-remote origin refs/heads/main` both returned `008b101fffe516d7651cb99f271883509b730072`. This verifies remote synchronization of the actual changes, not synchronization with the unavailable archive.

The sole source/CI change is a one-line workflow fixture correction:

```diff
-          cp deployment/aws/.env.runtime.example deployment/aws/.env.runtime
+          touch deployment/aws/.env.runtime
```

The original `cp` was reproduced with exit **1**: `cp: cannot stat 'deployment/aws/.env.runtime.example': No such file or directory`. `touch` supplies the ignored empty file needed for Compose configuration validation, preserves any existing contents, starts no service, and uses no credentials. Application code, tests, dependency declarations, lockfiles, and integrity manifests were not modified. The pre-existing untracked `CODEX_EXTERNAL_TEST_EVIDENCE.md` was preserved and not committed.

## Environment observed

Local observation timestamp: `2026-10-23T18:49:29.120695+00:00` (2026-10-24 in Asia/Kolkata).

| Component | Observed version or availability |
| --- | --- |
| OS | Linux 6.18.55, x86_64, glibc 2.41 |
| Node / npm | v24.19.0 / 11.9.0; hosted workflow requests Node 22.16.0 |
| Java | OpenJDK 21.0.12.1, build `21.0.12.1+1-1-deb13u1-Debian` |
| Maven | `mvn` unavailable on PATH |
| PostgreSQL | `psql`, `postgres`, `initdb`, and `pg_ctl` unavailable; no cached PostgreSQL image at initial inspection |
| Python / Playwright | 3.12.14 / 1.62.0; hosted workflow requests Playwright 1.56.0 |
| Browser binaries | Chromium headless shell revision 1234, Firefox 1538, and WebKit 2336 executables absent |
| Terraform | unavailable on PATH |
| Docker / Compose | client and daemon 28.4.0 / Compose v2.40.3 |

Version probes (`node --version`, `npm --version`, `java -version`, `docker version --format '{{.Client.Version}} / {{.Server.Version}}'`, `docker compose version`) exited **0**. Availability probes inspect executable paths and browser-file presence; they do not execute application suites. No missing PostgreSQL, Maven, Terraform, or browser runtime was installed.

## GitHub Actions execution and evidence

The complete [ci-main.yml at the final source/CI revision](https://github.com/kawakaze430/StreamAtlas/blob/008b101fffe516d7651cb99f271883509b730072/.github/workflows/ci-main.yml) was inspected. It is configured for pushes to main and manual dispatch. The direct source/CI push succeeded, but remote scheduling, completion, and results could not be observed. **A successful push is not evidence of passing CI.**

| Executed command | Exit | Observed result |
| --- | --- | --- |
| `gh api repos/kawakaze430/StreamAtlas/actions/runs --jq '.workflow_runs[:5] \| .[] \| {id,head_sha,name,status,conclusion,html_url}'` | 1 | Actions API `Forbidden` |
| `gh api repos/kawakaze430/StreamAtlas/commits/f3b796274923bbca3c2cacb3ba79ac72e9f7d089/check-runs --jq '.check_runs[] \| {name,conclusion,head_sha,html_url}'` | 1 | Check-runs API `Forbidden` |
| `gh workflow run ci-main.yml --ref main --repo kawakaze430/StreamAtlas` | 1 | Workflow lookup returned `Forbidden`; dispatch was not confirmed |
| `gh api repos/kawakaze430/StreamAtlas/commits/008b101fffe516d7651cb99f271883509b730072/check-runs --jq '.check_runs[] \| {name,conclusion,head_sha,html_url}'` | 1 | Check-runs API `Forbidden` after the source/CI push |

Sanitized API errors: `Get "https://api.github.com/repos/kawakaze430/StreamAtlas/actions/workflows/ci-main.yml": Forbidden` and equivalent `actions/runs` / commit `check-runs` errors. These are access blockers, not test failures. Existing HTTPS Git authentication worked for fetch and push; no token values were requested or inspected.

[Workflow runs listing](https://github.com/kawakaze430/StreamAtlas/actions/workflows/ci-main.yml?query=branch%3Amain) is a navigation link, not a verified run link. Individual run IDs, run URLs, job conclusions, and artifact download URLs were unavailable. Consequently, none of the four hosted jobs (`node-and-contracts`, `postgres-and-spring`, `browser-network`, `security-infra-and-build`) is credited with PASS or FAIL; execution/results are **NOT RUN by this executor / unverified remotely**.

Expected artifact names from the workflow definition are `streamatlas-browser-evidence`, `streamatlas-maven-test-reports` (failure only), and `streamatlas-ci-sbom`. Their existence was not verified.

## Test results

PASS below means a completed local check with the stated scope. NOT RUN means no independently verified result in this current-main validation; earlier engineer-reported passes are not relabeled as new passes.

| Category / command | Result | Exit | Evidence / limitation |
| --- | --- | --- | --- |
| Node regression: workflow's two `node --test --test-concurrency=2` batches | NOT RUN | N/A | Hosted access blocked. Existing application/test content is unchanged from the engineer-tested v0.38 application; those passing local suites were not duplicated. |
| PostgreSQL 16: `node scripts/pg-migrations.js --check`, `--apply`, `--verify`; `node scripts/pg-concurrency-smoke.js`; ledger re-verification | NOT RUN | N/A | No local PostgreSQL runtime/client. No shared, production, or existing database was contacted. Static checks were not substituted for live verification. |
| Java 21: `mvn -f backend-spring/pom.xml -B -ntp test` | NOT RUN | N/A on current main | Java 21 present, Maven absent. The earlier v0.38 command attempt exited 127 (`mvn: command not found`), and was not repeated. No tracked `backend-spring/src/test` files exist; even a later Maven exit 0 requires checking test counts before claiming tested API behavior. |
| Chromium / Firefox / WebKit: `python qa/network-e2e.py --engines chromium firefox webkit --strict --output reports/qa-browser-results.json` | NOT RUN for each engine | N/A on current main | All required executables still absent. Earlier v0.38 runner exited 1 with all engine statuses `unavailable` and zero checks; that old run was not represented as a current-main run. |
| Accessibility: same browser command with `SA_QA_REQUIRE_AXE=1` and axe-core 4.10.3 | NOT RUN | N/A | Real browser runtimes absent; hosted axe results inaccessible. Previously passing offline Chromium audits were not repeated. |
| Static API contract gate: `npm run qa:contracts:strict` | NOT RUN | N/A | Existing application/contracts unchanged; previously verified static checks not duplicated. Hosted result unavailable. |
| Dynamic route gate: `npm run qa:dynamic:strict` | NOT RUN | N/A | `scripts/qa-dynamic-routes.js`, `qa/dynamic-route-reviewed-baseline.json`, and this npm script are absent. Current workflow would emit a NOT RUN warning and exit successfully for this conditional step; a green job must not count this gate as passed. |
| Source integrity: `npm run qa:release:verify` | **FAIL** | **1** | `Error: Source integrity mismatch: deployment/aws/.env.runtime.example`. Confirmed missing tracked-release input, not an unexplained runtime issue. |
| Source security / infrastructure policy: `npm run qa:security`, `npm run qa:infra`, SBOM generation | NOT RUN | N/A | Prior static security/infrastructure verification was not duplicated. Hosted results/artifacts inaccessible. |
| Dependency security: `npm_config_cache=/tmp/streamatlas-main-ci-61olm40y/npm-cache npm audit --omit=dev --audit-level=high` | **PASS** | **0** | `found 0 vulnerabilities`; current lockfile has no third-party dependency entries. This does not establish broader application security. |
| Terraform: `terraform -chdir=<directory> init -backend=false -input=false` and `validate`, for media-cdn, queue, edge-waf | NOT RUN | N/A | Terraform unavailable. No plan, apply, credentials, provider integration, or cloud resources used. |
| Original Docker CI fixture: `cp deployment/aws/.env.runtime.example deployment/aws/.env.runtime` | **FAIL, fixed** | **1** | Reproduced in an isolated tracked-source export; missing example file. |
| Corrected Compose gate: `touch deployment/aws/.env.runtime && docker compose -f deployment/aws/compose.yaml config --quiet --no-interpolate` | **PASS** | **0** | Exact replacement workflow commands completed. No Compose services started and no public ports bound. |
| Initial `docker build -f deployment/aws/Dockerfile -t streamatlas-ci:synthetic .` | NOT RUN (build initialization blocked) | **1** | `ERROR: mkdir <user-home>/.docker/buildx: read-only file system`; environment configuration issue, not a Dockerfile failure. |
| `BUILDX_CONFIG=/tmp/streamatlas-main-ci-61olm40y/buildx docker build -f deployment/aws/Dockerfile -t streamatlas-ci:synthetic .` | **PASS** | **0** | Full Dockerfile build completed after selecting a writable Buildx configuration directory. No verification was disabled. No application container was launched or deployed. |

Docker/Compose checks used `/tmp/streamatlas-main-ci-61olm40y/context`, extracted from `git archive --format=tar HEAD` at `f3b796274923bbca3c2cacb3ba79ac72e9f7d089`, using Python tar extraction with `filter='data'`. This excluded untracked evidence, runtime data, credentials, and ignored private files. An initial preparation helper exited 1 while trying to copy the same missing template; the explicit `cp` reproduction above confirmed the cause. `git diff --exit-code f3b796274923bbca3c2cacb3ba79ac72e9f7d089..HEAD -- . ':(exclude).github'` exited **0** after the fix: all image build inputs were unchanged, and `.dockerignore` excludes `.github`. The candidate Compose commands tested are exactly the committed correction.

Built image: `sha256:7d772347f9d5f9eb89f4688d1f2ed6d4555049ac3eba6f534ed6b9b8662e7b2b`. Base image resolved to `node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34`. `docker image inspect streamatlas-ci:synthetic --format '{{.Id}}'` exited **0**. This is image-build evidence only.

## Integrity failure diagnosis

A read-only comparison of all 456 `qa/inventory.json` entries found exactly one missing input and no checksum mismatches among existing inputs:

```text
deployment/aws/.env.runtime.example
expected SHA-256: 2c8df6f759deff80bca7e19887785fe2cda1c1e9908764548b84aa4d4ecf420c
```

The inventory comparison exited **0** as a diagnostic script and printed the missing entry; this is not a passing integrity gate. The actual release-verification command exited **1**. The template's original bytes are unavailable from the inspected revisions/current checkout and the missing archive. Checksums/manifests were not regenerated, and the assertion was not weakened. The Compose fixture correction fixes only the configuration-check prerequisite; it does not fix this release-integrity failure.

Exact preparation helper, executed from `/workspace/StreamAtlas`, exit **1** at `shutil.copyfile` because the template was missing. The tracked-source export itself completed:

```sh
python - <<'PY'
import pathlib, shutil, subprocess, tarfile, tempfile
root=pathlib.Path(tempfile.mkdtemp(prefix='streamatlas-main-ci-',dir='/tmp'))
archive=root/'tracked.tar'
with archive.open('wb') as out:
    subprocess.run(['git','archive','--format=tar','HEAD'],stdout=out,check=True)
context=root/'context'
context.mkdir()
with tarfile.open(archive) as tar:
    tar.extractall(context, filter='data')
archive.unlink()
shutil.copyfile(context/'deployment/aws/.env.runtime.example',context/'deployment/aws/.env.runtime')
print(context)
PY
```

Exact read-only inventory diagnostic, executed from `/workspace/StreamAtlas`, exit **0** (diagnostic findings above):

```sh
python - <<'PY'
import hashlib,json,pathlib
root=pathlib.Path('.')
i=json.loads((root/'qa/inventory.json').read_text())
for f in i['sourceFiles']:
    p=root/f['path']
    if not p.is_file():
        print(json.dumps({'path':f['path'],'status':'missing','expected_sha256':f['sha256']}))
    elif hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:
        print(json.dumps({'path':f['path'],'status':'checksum-mismatch'}))
print('inventory_entries='+str(len(i['sourceFiles'])))
PY
```

## Main-only publication checks

The following completed with exit **0** before report publication:

```sh
git fetch origin main
git branch -m main
git branch --set-upstream-to=origin/main main
git merge --ff-only origin/main
git push --dry-run origin main:main
git diff --check
git add -- .github/workflows/ci-main.yml
git commit -m "ci: use empty runtime fixture for compose validation"
git push origin main:main
git ls-remote origin refs/heads/main
git diff --exit-code origin/main -- .
git diff --exit-code a1b73300336573b7fccd936669b830a6157a63ed..f3b796274923bbca3c2cacb3ba79ac72e9f7d089 -- . ':(exclude).github/workflows/ci-main.yml' ':(exclude)docs/CODEX_MAIN_ONLY_TEST_INSTRUCTIONS.md'
```

Only the workflow fixture fix and this evidence report are intended tracked changes from the fetched main. No secrets, databases, media, archives, screenshots, test logs, or temporary build files are included.

## Remaining blockers and minimum next actions

1. Provide the complete authentic v0.39 archive before any v0.39 synchronization or cumulative-release claim. Current-main validation was explicitly selected while this remains blocked.
2. Restore the authentic `.env.runtime.example` matching the checked-in checksum, or supply a separately reviewed source correction with an intentional integrity-manifest update. Do not substitute an empty file or regenerate checksums merely to pass release verification.
3. Enable supported access to this private repository's Actions runs, checks, artifacts, and workflow dispatch. Inspect the main-push workflow at the final remote SHA; collect job/step results, actual test counts, per-engine and axe outcomes, and artifact links. A dispatch rejection or unavailable result is not PASS.
4. If hosted execution is unavailable, supply the missing disposable PostgreSQL 16/client, Maven under Java 21, pinned browser runtimes/axe, and Terraform before the unrun gates can be credited.

No application bug or API-parity failure was established. The confirmed repository failures are the missing integrity input and its original CI copy prerequisite; only the latter was safely corrected here. Overall external validation and v0.39 synchronization remain incomplete. No production acceptance or deployment approval is implied.
