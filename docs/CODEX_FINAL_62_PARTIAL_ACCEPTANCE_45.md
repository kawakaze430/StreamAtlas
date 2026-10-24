# StreamAtlas — one consolidated external acceptance prompt (Checkpoint 45)

You are the **last-mile external QA verifier**, not the primary feature implementer.
Private repository: `kawakaze430/StreamAtlas`. The source of truth is the latest
fast-forward commit on existing `main`, plus `qa/partial-acceptance45.json` and
`AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_45.csv`.

## Mandatory Git and operational restrictions

- Work **only on existing `main`**. Do not create branches, worktrees, PRs, forks,
  releases, or tags. Fetch main before any write; commit fixes directly to main,
  fast-forward only; **never force-push** or bypass protection.
- Do not rebuild, refactor, or repeat a passing test merely to use up time. Start
  with GitHub Actions **at the current exact source SHA** and evidence artifacts.
- Never deploy a public site, publish adult content, upload real identities,
  store actual explicit media, modify production storage, contact a third-party
  age-assurance vendor or spend AWS/Azure/Colab credits without a separate
  explicit authorization. Never ingest private credentials into test fixtures.
- Software tests cannot provide independent legal, participant-age/consent,
  territory, provider, staffed moderation or penetration-test signoffs.
- Do not upgrade a tracker task to `LOCAL` or `COMPLETE` merely because a helper
  returned PASS. Include the exact independent acceptance conditions and proof.

## Execute once; prefer existing successful CI

1. Read Checkpoint 45 `docs/RELEASE_45.md` and the acceptance report; verify the
   source manifest with `npm run qa:release:verify` and the 117 distinct IDs.
2. Inspect five workflows: comprehensive, PostgreSQL 16/Spring, prototype,
   security, checkpoint 21. Collect exact commit SHA, logs, JSON evidence,
   engine/version, test counts and final conclusions; do not interpret an older
   successful SHA as proof for changed code.
3. **F03/F02:** Verify hosted PostgreSQL 16 executes guarded migrations, the
   SHA-verified catalog import, and row-by-row equality of all 10 catalog tables.
   Preserve the `sa_disposable_*`/loopback/explicit-loss guard, inspect denial
   of a nonempty database and tampered source. Never connect a real database.
4. **A03/A05/B03/B05/B06/B07/B12/B14:** Check real Chromium/Firefox/WebKit
   desktop/mobile-touch contexts and axe results; document exact UI/ABR gaps.
   Throttle an actual HLS source and observe ABR variant changes plus position
   preservation if the runtime permits; otherwise mark NOT RUN with reason.
   Real iOS/Safari and physical touch/device acceptance need a human/device.
5. **E05/G07/G08/I03:** Run offline mock-AWS tests for stable CallerReference,
   `PENDING`→`REQUESTED`→`COMPLETED` only on matching provider response. They
   are **not** proof of actual CDN purge, source-bucket isolation, signed-cookie
   expiry, key rotation or old-URL denial. External AWS verification requires
   separate private staging approval.
6. **F06/F07/F08:** Report genuine Node-vs-Spring contract and authenticated
   role denial gaps; no canary, dual writes, cutover, rollback or public traffic
   until independent verified stateful parity and backup restore exist.
7. **E01/E02/E03/J08/J09/J12/G15:** Describe what has never been tested with
   disposable isolated distributed queues, object storage, antivirus,
   concurrency, RPO/RTO, backpressure, failover and real restore.
8. **Other 62-item matrix:** Traverse every task ID in
   `qa/partial-acceptance45.json`, preserving requirement wording; attach
   concrete evidence when available, otherwise exact external dependency and
   the minimal test to perform. Provider, payment, DRM, legal and operational
   checks remain NOT RUN or BLOCKED until independently provided.

## Deliverables and stopping rules

Commit only small reproduced source/CI fixes, if any, directly to existing `main`.
Write `CODEX_FINAL_62_PARTIAL_EVIDENCE.md` on main with an **all-62-row** table
including PASS/FAIL/NOT RUN/BLOCKED, exact SHA, test environment, execution
command, exit code, artifact/workflow URL, external dependency, and severity.
Clearly separate locally implemented from fully operational production service.
Include an executive summary: which acceptance evidence now exists, which P0
items block private cloud launch, and what requires actual human/provider approval.

**Do not declare worldwide or adult-content production readiness.** Stop after
this single consolidated, nonduplicative technical acceptance audit; return the
report to the primary engineer. No promises of later unattended execution.
