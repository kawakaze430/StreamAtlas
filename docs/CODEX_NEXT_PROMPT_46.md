# Next StreamAtlas engineering prompt

You are taking primary implementation and testing ownership of the private
`kawakaze430/StreamAtlas` repository after checkpoint v0.46.0. Continue useful
implementation; do not stop at a plan or infer acceptance from scaffolding.

**MANDATORY: use the existing `main` branch only. Do not create a branch,
worktree, pull request, fork or tag. Never force-push, bypass protection or
overwrite concurrent commits. Commit verified work and push normally directly
to `main`. If direct-main writes are blocked, report the exact blocker.**

1. Fetch actual remote main first. Record SHA and working-tree state, preserve
   user files and newer remote commits, and read repository instructions.
   Verify source integrity before regenerating manifests. Read
   `HANDOFF_START_HERE.md`, `docs/RELEASE_46.md`, `CODEX_MAIN_TEST_EVIDENCE.md`,
   `AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_46.csv`,
   `AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_46.md`,
   `qa/partial-acceptance46.json` and `docs/PRODUCTION_GATES.md`.
2. Inspect `.github/workflows/ci-main.yml` results at the exact current source
   SHA. Reuse passing evidence for unchanged code. Do not call a workflow PASS
   from its existence, an inaccessible API or a different commit. Required
   coverage includes Node/Python regressions, static/dynamic contracts, vendor
   provenance/advisory audit, source integrity, disposable PostgreSQL16
   migration/concurrency/full-row import, Java21 unit/account-PG tests, actual
   Node/Spring shadow reads, three browser engines/accessibility, security,
   Terraform and Docker. Every missing runtime/evidence is NOT RUN.
3. Continue locally implementable P0 requirements in this order:
   - **F04/F06/F07:** Implement guarded synthetic account-data migration and the
     next authenticated Spring modules. Add behavioral Node/Spring success and
     denial parity using real disposable PostgreSQL. Preserve session expiry,
     account closure/revocation, role checks, MFA boundaries and CSRF for writes.
     Two account GETs and catalog tests do not establish full API parity.
   - **F08/F02/J09:** Rehearse a synthetic checkpointed migration/rollback
     without shifting production traffic. Verify row/relationship parity and
     restoration before proposing any cutover. Keep cutover unapproved.
   - **E01/E02/E03:** Implement durable provider-independent private upload and
     job adapters in disposable environments, with resumability, quotas,
     idempotency, bounded retries/dead-letter recovery, lease ownership and
     supervised worker cleanup. Offline multipart receipts are not evidence
     that a remote provider stored or verified bytes.
   - **B03/B05/B06/B07/B09:** Use the real pinned hls.js bundle and synthetic
     media to test decoding, Auto/manual quality changes, recovery, revoked
     authorization and negative paths in Chromium/Firefox/WebKit. Do not replace
     these with a mocked player or deterministic trace. Physical Apple/Android
     device acceptance remains distinct from engine emulation.
   - Continue role/private-media/documentary/audit protections, recovery,
     observability and representative bounded failure/load checks. Then take
     remaining P1/P2 engineering from the tracker; preserve all prior features.
4. Fix only actual reproduced failures and rerun affected checks plus full
   relevant regression. Do not weaken tests, silently skip integration, mock
   provider acceptance or promote a task because a UI checkbox exists.
   Java PostgreSQL tests must run with their opt-in guards and nonzero,
   non-skipped test counts; unit PASS cannot mask integration NOT RUN.
5. Use GitHub Actions where possible for PostgreSQL16, Java21, real browsers,
   accessibility, dependency/security, Terraform and Docker. Locally use only
   disposable loopback databases with protected repository commands and
   explicit `sa_disposable_*` acknowledgment. Do not inspect or connect to
   shared/production databases. Keep token/cookie/body data out of evidence.
6. For the next substantial checkpoint, update all 117 task statuses with
   task-specific acceptance/evidence and preserve history. Keep external
   acceptance false unless its actual authority supplies it. Produce a complete
   cumulative source ZIP with every previous feature, SHA-256 and successful
   fresh-extraction verification. Exclude credentials, databases, private media,
   compiled output and temporary artifacts. Record exact tested commit,
   commands, exit codes, PASS/FAIL/NOT RUN, workflow/artifact links, sanitized
   errors and remaining blockers. Commit/push directly to main normally.

Do not deploy publicly or to production, spend AWS/Azure/Colab credits, operate
payments/providers, use real identity data or explicit media, or change public
launch gates without separate explicit user authorization. External legal,
provider, rights/age and staffed operational approval cannot be implemented
or self-certified in code.
