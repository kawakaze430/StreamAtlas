# StreamAtlas v0.46.0 — cumulative handoff

Start with `docs/RELEASE_46.md`, `CODEX_MAIN_TEST_EVIDENCE.md`,
`AUDIT_AND_HANDOFF/UPDATED_117_TASK_STATUS_46.csv`,
`AUDIT_AND_HANDOFF/UPDATED_117_TASK_ROADMAP_46.md`, and
`qa/partial-acceptance46.json`. The reusable next-agent prompt is
`docs/CODEX_NEXT_PROMPT_46.md`.

The checkpoint preserves v0.45 and adds verified vendored HLS, stronger dynamic
contracts, worker attempt/cancellation recovery, offline multipart contracts,
authenticated Spring account reads, bounded loopback shadow comparison and safe
cumulative source packaging. The evidence file identifies exact source SHA,
executed results, missing runtimes and archive verification.

The tracker retains 117 requirements: 28 LOCAL, 60 PARTIAL, 10 PREPARED, 19 BLOCKED.
Only B01 advances to LOCAL; that status covers its local vendoring requirement,
not browser playback or production approval. All62 originally partial tasks
remain explicitly represented with external acceptance false.

Work directly on existing main only: no branch, worktree, PR, fork, tag or
force-push. No paid cloud/provider operations, actual identities/private media,
public deployment or production release is authorized. Historical checkpoint
files remain evidence for their own commits, not the current source.
