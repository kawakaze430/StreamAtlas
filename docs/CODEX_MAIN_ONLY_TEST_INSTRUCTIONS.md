# StreamAtlas external QA — main branch only

Repository: kawakaze430/StreamAtlas (private).

**Do not create any new branch, pull request, fork, or tag. Make ordinary fast-forward commits to existing main only; never force-push or bypass branch protection.** Before writing, fetch main, record HEAD, inspect working tree, and avoid overwriting concurrent updates. Stop if direct-main writes are blocked.

The main engineer pushed .github/workflows/ci-main.yml at 9606ec798b1e0f32e9344a8ea63c1a3d9115c694. Preserve this file. The previously checked-in application was v0.38; the next complete cumulative source artifact is StreamAtlas v0.39 ZIP. Carefully synchronize missing v0.39 source, tests, reviewed dynamic API matcher baseline, 117-task ledger, and integrity manifests from the supplied ZIP, while preserving newer changes on main. Never commit secrets, runtime DBs, screenshots, logs, private media, or zip archives. If v0.39 ZIP is not available, do not pretend it is.

Run/inspect GitHub Actions at the exact final main commit, preferably the comprehensive ci-main workflow, using hosted CI for dependencies. It covers: Node 22 test batches, API contract and dynamic route gates, source integrity, disposable loopback PostgreSQL 16 migration and concurrency, Java 21 Maven tests, installed Chromium/Firefox/WebKit Playwright 1.56 browser/network/accessibility tests, npm security, offline Terraform validation and Docker checks. Missing runtimes are NOT RUN, not PASS. If a test fails, make only the smallest verified fix directly on main and rerun its failing gate plus local regression. Do not spend time rebuilding unrelated features or redundantly repeating suites.

No public deployment, AWS/Azure/Colab spend, provider integration, production credentials, real user data, or explicit media. No live adult-content launch or production approval claims.

Deliver CODEX_MAIN_TEST_EVIDENCE.md directly on main, including: exact SHA, tracked sync changes, every executed command and exit code, Actions run links and job results, PASS/FAIL/NOT RUN, artifact links, any blocker and exact minimum next action. No branch or PR.