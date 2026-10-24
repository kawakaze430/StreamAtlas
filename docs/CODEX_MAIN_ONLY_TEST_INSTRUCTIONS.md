# StreamAtlas — implementation and external QA on main only

Repository: `kawakaze430/StreamAtlas` (private). Current cumulative checkpoint:
v0.46.0; start with `HANDOFF_START_HERE.md` and `docs/CODEX_NEXT_PROMPT_46.md`.
The owner now authorizes implementation and testing. Earlier external-only QA
and unavailable v0.39 archive instructions are historical; they do not authorize
claiming an archive comparison that never ran.

**Use the existing main branch only. Do not create any branch, worktree, pull
request, fork or tag. Never force-push, bypass protection or overwrite concurrent
changes.** Fetch main before work, record HEAD and working-tree state, preserve
user files and newer upstream changes, and commit only verified changes. Push
normally directly to main. Report an actual write restriction if one occurs.

Read the current release, 117-task tracker, acceptance matrix, production gates
and exact-SHA evidence. Continue locally implementable P0 work, preserving prior
features. Implement the smallest sound fix for reproduced failures; do not weaken
tests or confuse scaffolding with acceptance. Reuse passing results only when
source and configuration are unchanged and the tested SHA is identified.

Use `.github/workflows/ci-main.yml` for Node/Python, static/dynamic contracts,
source integrity, vendored HLS provenance/advisories, PostgreSQL16 migration,
concurrency and full-row catalog parity, Java21 unit and real account-PG tests,
actual Node/Spring synthetic shadow reads, Chromium/Firefox/WebKit/accessibility,
security, Terraform and Docker. Inspect exact-SHA runs when accessible. An
inaccessible API or missing runtime is NOT RUN, never PASS. A skipped PostgreSQL
suite cannot be credited from passing unit tests. Preserve all existing required
gates and report sanitized errors and remaining blockers.

Live database commands require a newly created loopback `sa_disposable_*`
database and the repository's explicit disposable acknowledgment. Never use a
shared/production database. Use synthetic non-explicit fixtures only. Do not
spend cloud credits, deploy publicly or to production, operate payments/providers,
access real identity information or alter legal/launch approvals without separate
authorization.

For substantial checkpoints deliver verified source on main, complete cumulative
ZIP, SHA256 and fresh-extraction proof, updated task-level status/history, and
`CODEX_MAIN_TEST_EVIDENCE.md` with exact tested SHA, commands, exit codes,
PASS/FAIL/NOT RUN, available workflow links and next actions. Exclude credentials,
private media, runtime databases, compiled outputs and temporary artifacts.
