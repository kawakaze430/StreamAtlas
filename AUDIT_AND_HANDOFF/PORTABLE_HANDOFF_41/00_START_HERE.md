# StreamAtlas v0.41.0 — Continuation & acceptance

This is a **private synthetic-media prototype**, not a production-approved adult-content service. Open the complete ZIP rather than relying on the older GitHub application baseline; GitHub main may contain newer *selected* fixes but is not necessarily a full exact copy.

## Engineering changes

- Range-aware private MP4 serving handles RFC 9110 suffix/open-ended/exact ranges; invalid ranges and multi-range are rejected with HTTP 416.
- Private processed media requests check a configured trusted-root boundary, rejecting directory symlinks and traversals. This is defense in depth, **not** a race-free openat2 or sandbox.
- Production-mode server refuses to start if the private receipt-preview guard is unset or the development email outbox is enabled. Private receipts are a prototype control, **not** independent age verification.
- Private Docker preview forces the receipt guard on.

## Evidence and limitations

- 321 Node tests and 21 Python CI/reporting tests passed locally after merging the later Codex testing infrastructure. Java 21 controller tests (15) and live PostgreSQL migrations/concurrency passed on GitHub-hosted runners at specified commits.
- CI evidence belongs to its exact commit. Codex's comprehensive CI assets and controller tests are included in this ZIP. On main at b573398, real Chromium/Firefox/WebKit/axe, PostgreSQL, Spring, Terraform, Docker, security and Node checks passed individually; only the offline Chromium audit failed due missing MP4 codec support in Snap Chromium. CI is now configured to use a pinned Ubuntu runner and preinstalled Google Chrome for that offline check, but its passing result must be verified.
- External production acceptance remains outstanding: live managed PostgreSQL cutover, full Spring API parity, browser ABR/device matrix, independently audited security, verified rights/consent/age/jurisdiction/provider agreements, operations, DR and private AWS staging.

Never claim public worldwide launch approval. No cloud resources or credit spent, no deployment made.

## Newly consolidated CI confirmation

The main-only comprehensive GitHub workflow succeeded for all 15 jobs at commit `2416f6c129b1580eeeeee02e8492ccdef50c3555` (run 40064661241). Read `03_HOSTED_CI_ACCEPTANCE.md`. That GitHub HEAD and this complete `0.41.0` archive are not yet identical; preserve newer changes when synchronizing.
